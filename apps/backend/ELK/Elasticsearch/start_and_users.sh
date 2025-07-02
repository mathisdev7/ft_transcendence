#!/bin/bash

# # start ES in background
# ./bin/elasticsearch &

# # wait ES to be UP
# until curl -k -u elastic:$ELASTIC_PASSWORD https://localhost:9200; do
#   echo "Waiting for Elasticsearch to start..."
#   sleep 5
# done


# # Reset passwords via REST API
# curl -k -X PUT "https://localhost:9200/_security/user/kibana_system/_password" \
#      -H "Content-Type: application/json" \
#      -u elastic:$ELASTIC_PASSWORD \
#      -d '{"password": "'"$KIBANA_PASSWORD"'"}'

# curl -k -X PUT "https://localhost:9200/_security/user/logstash_system/_password" \
#      -H "Content-Type: application/json" \
#      -u elastic:$ELASTIC_PASSWORD \
#      -d '{"password": "'"$LOGSTASH_PASSWORD"'"}'





# Configuration des mots de passe
ELASTIC_PASSWORD="votre_mot_de_passe"
KIBANA_PASSWORD="kibana_password"
LOGSTASH_PASSWORD="logstash_password"

echo "=== FIX AUTHENTIFICATION ELASTICSEARCH ==="

# Fonction de nettoyage
cleanup() {
    echo "Nettoyage..."
    pkill -f elasticsearch
    exit
}
trap cleanup SIGINT SIGTERM

# Étape 1: Vérifier l'état actuel
check_elasticsearch_status() {
    echo "Vérification du statut d'Elasticsearch..."

    # Tester sans authentification
    if curl -s http://localhost:9200 >/dev/null 2>&1; then
        echo "✓ Elasticsearch accessible sans authentification"
        return 0
    # Tester avec authentification basique
    elif curl -s -u elastic:$ELASTIC_PASSWORD http://localhost:9200 >/dev/null 2>&1; then
        echo "✓ Elasticsearch accessible avec authentification"
        return 1
    else
        echo "✗ Elasticsearch non accessible"
        return 2
    fi
}

# Étape 2: Configuration initiale complète
setup_from_scratch() {
    echo "=== CONFIGURATION DEPUIS ZÉRO ==="

    # Arrêter Elasticsearch s'il tourne
    echo "Arrêt d'Elasticsearch existant..."
    pkill -f elasticsearch
    sleep 5

    # Nettoyer les données existantes (ATTENTION: efface tout !)
    read -p "Voulez-vous effacer les données existantes ? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Suppression des données..."
        rm -rf data/
        rm -rf logs/
    fi

    # Démarrer Elasticsearch
    echo "Démarrage d'Elasticsearch..."
    ./bin/elasticsearch &
    ES_PID=$!

    # Attendre qu'il soit complètement prêt
    echo "Attente du démarrage complet..."
    MAX_WAIT=60
    COUNTER=0

    while [ $COUNTER -lt $MAX_WAIT ]; do
        if curl -s http://localhost:9200 >/dev/null 2>&1; then
            echo "✓ Elasticsearch démarré"
            break
        fi
        echo "Attente... ($COUNTER/$MAX_WAIT)"
        sleep 2
        COUNTER=$((COUNTER + 2))
    done

    if [ $COUNTER -ge $MAX_WAIT ]; then
        echo "✗ Timeout - Elasticsearch n'a pas démarré"
        cleanup
    fi

    # Configuration des mots de passe
    echo "Configuration des mots de passe système..."

    # Méthode 1: setup-passwords (recommandée pour première installation)
    {
        echo "y"                    # Confirmer
        echo "$ELASTIC_PASSWORD"    # elastic password
        echo "$ELASTIC_PASSWORD"    # confirm elastic
        echo "$ELASTIC_PASSWORD"    # apm_system (utiliser le même pour simplifier)
        echo "$ELASTIC_PASSWORD"    # confirm apm_system
        echo "$KIBANA_PASSWORD"     # kibana_system
        echo "$KIBANA_PASSWORD"     # confirm kibana_system
        echo "$LOGSTASH_PASSWORD"   # logstash_system
        echo "$LOGSTASH_PASSWORD"   # confirm logstash_system
        echo "$ELASTIC_PASSWORD"    # beats_system
        echo "$ELASTIC_PASSWORD"    # confirm beats_system
        echo "$ELASTIC_PASSWORD"    # remote_monitoring_user
        echo "$ELASTIC_PASSWORD"    # confirm remote_monitoring_user
    } | timeout 60 ./bin/elasticsearch-setup-passwords interactive

    # Attendre la prise en compte
    sleep 10

    # Vérifier la configuration
    if curl -s -u elastic:$ELASTIC_PASSWORD http://localhost:9200 >/dev/null 2>&1; then
        echo "✓ Configuration réussie !"
        return 0
    else
        echo "✗ Échec de la configuration avec setup-passwords"
        return 1
    fi
}

# Étape 3: Réinitialisation des mots de passe individuellement
reset_individual_passwords() {
    echo "=== RÉINITIALISATION INDIVIDUELLE ==="

    # Réinitialiser le mot de passe elastic
    echo "Réinitialisation du mot de passe elastic..."
    echo "$ELASTIC_PASSWORD" | ./bin/elasticsearch-reset-password -u elastic -i -b -s
    sleep 3

    # Tester l'authentification elastic
    if curl -s -u elastic:$ELASTIC_PASSWORD http://localhost:9200 >/dev/null 2>&1; then
        echo "✓ Mot de passe elastic configuré"

        # Maintenant configurer les autres utilisateurs
        echo "Configuration des autres utilisateurs..."

        # kibana_system
        echo "$KIBANA_PASSWORD" | ./bin/elasticsearch-reset-password -u kibana_system -i -b -s

        # logstash_system
        echo "$LOGSTASH_PASSWORD" | ./bin/elasticsearch-reset-password -u logstash_system -i -b -s

        echo "✓ Tous les mots de passe configurés"
        return 0
    else
        echo "✗ Impossible de configurer le mot de passe elastic"
        return 1
    fi
}

# Étape 4: Méthode alternative avec API REST
setup_via_api() {
    echo "=== CONFIGURATION VIA API ==="

    # D'abord, essayer de configurer elastic avec bootstrap
    export ELASTIC_PASSWORD_SETTING="bootstrap.password: $ELASTIC_PASSWORD"

    # Redémarrer avec le bootstrap password
    pkill -f elasticsearch
    sleep 3

    # Ajouter temporairement le bootstrap password dans elasticsearch.yml
    echo "bootstrap.password: $ELASTIC_PASSWORD" >> config/elasticsearch.yml

    ./bin/elasticsearch &
    ES_PID=$!
    sleep 30

    # Maintenant configurer via API
    curl -X POST "localhost:9200/_security/user/kibana_system/_password" \
         -u elastic:$ELASTIC_PASSWORD \
         -H "Content-Type: application/json" \
         -d "{\"password\":\"$KIBANA_PASSWORD\"}"

    curl -X POST "localhost:9200/_security/user/logstash_system/_password" \
         -u elastic:$ELASTIC_PASSWORD \
         -H "Content-Type: application/json" \
         -d "{\"password\":\"$LOGSTASH_PASSWORD\"}"

    # Nettoyer le fichier de configuration
    sed -i '/bootstrap.password/d' config/elasticsearch.yml
}

# Fonction principale
main() {
    # Vérifier le statut actuel
    check_elasticsearch_status
    STATUS=$?

    case $STATUS in
        0)
            echo "Elasticsearch fonctionne sans sécurité - configuration nécessaire"
            setup_from_scratch
            ;;
        1)
            echo "Elasticsearch déjà configuré avec authentification"
            echo "Test des connexions..."
            curl -u elastic:$ELASTIC_PASSWORD http://localhost:9200
            ;;
        2)
            echo "Elasticsearch non accessible - démarrage nécessaire"
            setup_from_scratch
            ;;
    esac

    # Si tout a échoué, essayer la méthode alternative
    if ! curl -s -u elastic:$ELASTIC_PASSWORD http://localhost:9200 >/dev/null 2>&1; then
        echo "Tentative avec méthode alternative..."
        reset_individual_passwords
    fi

    # Test final
    echo "=== TEST FINAL ==="
    if curl -s -u elastic:$ELASTIC_PASSWORD http://localhost:9200; then
        echo "✓ SUCCESS: Elasticsearch configuré et accessible"
        echo "Credentials:"
        echo "  - elastic: $ELASTIC_PASSWORD"
        echo "  - kibana_system: $KIBANA_PASSWORD"
        echo "  - logstash_system: $LOGSTASH_PASSWORD"
    else
        echo "✗ ÉCHEC: Problème de configuration persistant"
        echo "Logs Elasticsearch:"
        tail -20 logs/elasticsearch.log
    fi
}

# Lancer le script
main "$@"
