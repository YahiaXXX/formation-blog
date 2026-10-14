# Helm chart: blog-platform

Turns blog-platform-simple2.yaml into a chart. Resource names are fixed (backend, web, admin, mysql ...)
so the in-cluster DNS names keep working: one release per namespace.

    blog-platform/
      Chart.yaml            chart name/version + appVersion (shown by `helm list`)
      values.yaml           every setting you can change (image, tag, replicas, resources, ingress host, config)
      values-original.yaml  overrides that reproduce your ORIGINAL yaml exactly
      templates/            secret, mariadb, backend, web, admin, ingress, NOTES
    compare.py              compares your original yaml with what the chart renders

## 0. Variables (on the server)
    NS=$(kubectl config view --minify -o jsonpath='{..namespace}'); echo $NS
    unzip blog-platform-chart.zip && cd blog-platform-chart

## 1. Lint (no cluster needed)
    helm lint ./blog-platform                       # expected: 0 chart(s) failed

## 2. Check the rendering BEFORE touching the cluster
    helm template blog ./blog-platform -n $NS -f blog-platform/values-original.yaml > rendered.yaml
    python3 compare.py ~/formation-blog/blog-platform-simple2.yaml rendered.yaml
    # expected last line: IDENTICAL, field for field
    helm template blog ./blog-platform -n $NS | less      # default values (adds the backend startupProbe fix)
    helm install blog ./blog-platform -n $NS --dry-run    # asks the cluster to validate it

## 3. Hand the deployment over to Helm (choose ONE)

A) Exercise way: delete what kubectl created, then install  (the database content is lost)
    kubectl delete -f ~/formation-blog/blog-platform-simple2.yaml
    kubectl get pvc                                       # then delete the MariaDB volumes:
    kubectl delete pvc -l app.kubernetes.io/instance=mysql
    helm install blog ./blog-platform -n $NS

B) Keep the running objects and the data: let Helm adopt them
    for r in secret/blog-secrets mariadb/mysql deployment/backend service/backend \
             deployment/web service/web deployment/admin service/admin; do
      kubectl annotate $r meta.helm.sh/release-name=blog meta.helm.sh/release-namespace=$NS --overwrite
      kubectl label $r app.kubernetes.io/managed-by=Helm --overwrite
    done
    helm install blog ./blog-platform -n $NS

## 4. Verify
    helm list -n $NS                 # blog  1  deployed  blog-platform-0.1.0  1.0.0
    kubectl get pods -n $NS -w
    bash check-mariadb.sh

## 5. Day-2 with Helm
    helm upgrade blog ./blog-platform -n $NS --set backend.replicas=2
    helm upgrade blog ./blog-platform -n $NS --set web.image.tag=1.0.1 --set admin.image.tag=1.0.1
    helm upgrade blog ./blog-platform -n $NS --set mariadb.resources.limits.memory=512Mi
    helm history blog -n $NS
    helm rollback blog 1 -n $NS
    helm get values blog -n $NS
    helm uninstall blog -n $NS       # the database volumes (PVC) stay: delete them yourself if you want

## 6. Ingress (the app answers through a host name)
    helm upgrade blog ./blog-platform -n $NS \
      --set ingress.enabled=true --set ingress.className=nginx \
      --set ingress.webHost=web.1.2.3.4.nip.io --set ingress.adminHost=admin.1.2.3.4.nip.io
    kubectl get ingress -n $NS
(ask your instructor for the ingress class and the IP; nip.io turns web.1.2.3.4.nip.io into 1.2.3.4)

## Passwords
By default the chart creates the Secret from values.yaml (placeholders!). Better:
    kubectl create secret generic blog-secrets --from-literal=MYSQL_ROOT_PASSWORD=... (5 keys, see values.yaml)
    helm install blog ./blog-platform -n $NS --set secret.create=false
