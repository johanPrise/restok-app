const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

/**
 * Le lint du mobile.
 *
 * Il manquait : la CI annonçait « le typage et le lint » pour les trois
 * suites, et ne lintait que le backend. Un typage seul laisse passer tout ce
 * qui compile sans être juste — une variable inutilisée, un hook appelé sous
 * condition.
 *
 * `eslint-config-expo` plutôt qu'une liste de règles à nous : il connaît
 * `expo-router`, les règles des hooks et les particularités de React Native,
 * que nous aurions rassemblées à la main et de travers.
 *
 * Prettier passe **en dernier** : il éteint les règles de style des configs
 * précédentes et fait de son formatage la seule autorité, plutôt que de le
 * voir se battre avec elles. C'est le même arrangement que le backend.
 */
module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    // Rien à dire sur ce qu'on ne versionne pas.
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
]);
