import { defineConfig } from 'vitest/config';

// Vitest roda os testes em ambiente Node (o domínio não depende do DOM/Eletron).
// Inclui a pasta tests/ e ignora node_modules.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globals: false,
  },
});
