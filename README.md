# Chatbot Trainer - Démonstrateur d'entraînement à la communication

Un démonstrateur de chatbot d'entraînement à la communication développé avec Vue.js 3 et Vite.

## Stack Technique

- **Vue 3** avec Composition API
- **Vite** comme build tool
- **CSS vanilla** (pas de framework CSS)
- **SPA** (Single Page Application)

## Structure du Projet

```
src/
├── App.vue              # Composant principal avec l'interface chatbot
├── main.js              # Point d'entrée de l'application
├── style.css            # Styles CSS vanilla
└── composables/
    └── useChatbot.js    # Composable pour la logique du chatbot
```

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## Build

```bash
npm run build
```

## Déploiement

Le projet est configuré pour un déploiement facile sur Vercel avec le fichier `vercel.json`.

## Fonctionnalités

### Actuelles
- Interface chatbot responsive et moderne
- Gestion des messages avec scroll automatique
- Indicateur de frappe
- Support clavier (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)
- Textarea auto-redimensionnable
- Réponses simulées du chatbot

### À venir
- Intégration API OpenAI/Claude
- Gestion des erreurs d'API
- Historique des conversations
- Export des conversations
- Paramètres personnalisables

## Configuration API

Le composable `useChatbot.js` est préparé pour l'intégration future d'APIs externes :

```javascript
// Dans src/composables/useChatbot.js
const config = reactive({
  apiEndpoint: '', // À configurer pour OpenAI/Claude
  maxMessages: 100,
  typingDelay: { min: 1000, max: 3000 }
})
```

## Développement

### Ajouter une nouvelle fonctionnalité
1. Créer un nouveau composable dans `src/composables/` si nécessaire
2. Modifier `App.vue` pour l'interface
3. Mettre à jour les styles dans `style.css`

### Intégrer une API de chat
1. Configurer l'endpoint dans `useChatbot.js`
2. Remplacer `generateMockResponse()` par un appel API réel
3. Ajouter la gestion des clés API via variables d'environnement

## License

MIT
