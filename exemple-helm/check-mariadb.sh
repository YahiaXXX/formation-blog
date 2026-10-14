#!/usr/bin/env bash
# Checks the MariaDB Galera cluster (3 pods) and the backend connection.
# Usage: bash check-mariadb.sh [mariadb-resource-name] [replicas]     (defaults: mysql 3)
N=${1:-mysql}; R=${2:-3}; FAILED=0
pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1"; FAILED=1; }
sql()  { kubectl exec "$1" -c mariadb -- bash -c "mariadb -uroot -p\"\$MARIADB_ROOT_PASSWORD\" -N -e \"$2\"" 2>/dev/null; }

echo "== 1. Operator resource =="
kubectl get mariadb "$N"
READY=$(kubectl get mariadb "$N" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
[ "$READY" = "True" ] && pass "MariaDB resource is Ready" || fail "MariaDB resource not Ready (kubectl describe mariadb $N)"
echo "  current primary pod: $(kubectl get mariadb "$N" -o jsonpath='{.status.currentPrimary}' 2>/dev/null)"

echo; echo "== 2. Each Galera node =="
for i in $(seq 0 $((R-1))); do
  P="$N-$i"
  PHASE=$(kubectl get pod "$P" -o jsonpath='{.status.phase}' 2>/dev/null)
  [ "$PHASE" = "Running" ] && pass "$P is Running" || { fail "$P is not Running ($PHASE)"; continue; }
  SIZE=$(sql "$P" "SHOW STATUS LIKE 'wsrep_cluster_size'" | awk '{print $2}')
  STAT=$(sql "$P" "SHOW STATUS LIKE 'wsrep_cluster_status'" | awk '{print $2}')
  RDY=$(sql "$P" "SHOW STATUS LIKE 'wsrep_ready'" | awk '{print $2}')
  STATE=$(sql "$P" "SHOW STATUS LIKE 'wsrep_local_state_comment'" | awk '{print $2}')
  echo "         cluster_size=$SIZE cluster_status=$STAT ready=$RDY state=$STATE"
  [ "$SIZE" = "$R" ] && [ "$STAT" = "Primary" ] && [ "$RDY" = "ON" ] && [ "$STATE" = "Synced" ] \
    && pass "$P is Synced in a cluster of $R" || fail "$P is not healthy in the cluster"
done

echo; echo "== 3. Replication test (write on node 0, read on every node) =="
sql "$N-0" "CREATE TABLE IF NOT EXISTS blog.repl_test (id INT AUTO_INCREMENT PRIMARY KEY, t TIMESTAMP DEFAULT CURRENT_TIMESTAMP)" >/dev/null
sql "$N-0" "INSERT INTO blog.repl_test () VALUES ()" >/dev/null
sleep 2
EXPECT=$(sql "$N-0" "SELECT COUNT(*) FROM blog.repl_test")
for i in $(seq 0 $((R-1))); do
  C=$(sql "$N-$i" "SELECT COUNT(*) FROM blog.repl_test")
  [ -n "$C" ] && [ "$C" = "$EXPECT" ] && pass "$N-$i has $C row(s) (same as node 0)" || fail "$N-$i has '$C' row(s), expected $EXPECT"
done
sql "$N-0" "DROP TABLE blog.repl_test" >/dev/null

echo; echo "== 4. Services =="
EP=$(kubectl get endpoints "$N-primary" -o jsonpath='{.subsets[0].addresses[0].ip}' 2>/dev/null)
[ -n "$EP" ] && pass "$N-primary points to $EP" || fail "$N-primary has no endpoint (check: kubectl get svc | grep $N)"

echo; echo "== 5. Backend -> database =="
kubectl exec deploy/backend -- wget -qO- -T 5 http://localhost:4000/ready >/dev/null 2>&1 \
  && pass "backend /ready (it can query the database)" || fail "backend /ready failed (kubectl logs deploy/backend)"
echo "  backend DB_HOST = $(kubectl exec deploy/backend -- printenv DB_HOST 2>/dev/null)"
echo "  last backend log: $(kubectl logs deploy/backend --tail=1 2>/dev/null)"

echo; [ $FAILED = 0 ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit $FAILED
