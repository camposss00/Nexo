# Nexo · Projeto completo para Vercel

App de estudos em português para a 3ª série do Ensino Médio. Esta versão usa **Vercel Functions**, **login Google** e **Neon Postgres** para manter o progresso entre sessões. Não depende de Sites, Cloudflare ou D1.

Inclui 40 resumos, 120 flashcards, 30 questões autorais com correção, 10 cadernos oficiais, planejamento de redação, perfil e histórico por aluno. Os três PDFs locais estão em `public/provas/`; os demais cadernos remetem ao Drive original.

É uma coleção inicial: faltam gabaritos oficiais e materiais integrais de algumas matérias, provas do ITA e a segunda fase da Fuvest. Não equivale a um curso completo de todos os vestibulares.

## Deploy manual sem GitHub

Requer Node.js 22 e acesso à sua conta Vercel.

1. Extraia o ZIP e abra um terminal na pasta que contém `package.json` e `vercel.json`.
2. Execute:

```sh
npm ci
npx vercel login
npx vercel link
```

3. No projeto Vercel, adicione um banco **Neon Postgres** pelo Marketplace/Storage e conecte-o ao projeto. Confira a variável `DATABASE_URL` em **Settings → Environment Variables**. Use uma URL de conexão Neon; o adaptador não é um cliente Postgres TCP genérico.
4. Abra o **SQL Editor** do Neon e execute todo o arquivo `db/001-initial.sql` uma vez para criar as tabelas. Não há criação automática de tabelas durante requisições.
5. No Google Auth Platform, crie/configure um cliente OAuth do tipo **Aplicativo da Web** para o Nexo. Veja `LOGIN-GOOGLE.md`.
6. Na Vercel, configure as variáveis abaixo, no ambiente **Production** e nos outros ambientes que você pretende usar:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | Conexão com o banco Neon |
| `GOOGLE_CLIENT_ID` | ID público do cliente OAuth, terminado em `.apps.googleusercontent.com` |
| `GOOGLE_SESSION_SECRET` | Segredo aleatório, com pelo menos 32 caracteres |

Para gerar um segredo no seu computador:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copie o resultado somente para as variáveis da Vercel. Não envie esse segredo por mensagens, não o coloque no código e não faça commit de `.env.local`.

7. Publique:

```sh
npx vercel --prod
```

8. Copie a **origem do domínio de produção** exibido pela Vercel para **Origens JavaScript autorizadas** do cliente Google: `https://seu-projeto.vercel.app`, sem caminho nem barra final. Autorize também qualquer domínio próprio que venha a usar. O ID do cliente pode ser criado antes do deploy; a entrada só funcionará depois de autorizar o domínio real.
9. Abra o domínio, entre com Google, preencha o perfil, conclua um resumo e atualize a página para verificar o histórico. Teste uma segunda conta para conferir a separação dos dados.

Para distribuir a plataforma aos alunos, confira a proteção de deployments da Vercel e configure o público/estado de publicação do app Google. Se a autenticação Google estiver em testes, apenas as contas de teste cadastradas poderão entrar. Não use URLs temporárias de preview como origem principal do login.

## Alternativa: painel Vercel com repositório

Se preferir importar um repositório, envie os arquivos e pastas extraídos ao seu repositório e importe pela Vercel. Não envie apenas o ZIP. Use **Framework Preset: Other**, **Build Command: `npm run build`**, **Output Directory: `dist`**, **Install Command: `npm ci`**, **Node.js: 22.x**. A pasta raiz deve conter `vercel.json`. Faça a mesma configuração de banco e Google descrita acima.

## Desenvolvimento local

Após `npm ci`, copie `.env.example` para `.env.local` e configure as três variáveis. Use um banco de desenvolvimento separado. As origens locais necessárias estão em `LOGIN-GOOGLE.md`.

```sh
npm run db:migrate
npx vercel dev
```

A porta e a origem locais são as exibidas pelo `vercel dev`; autorize exatamente essa origem no Google. A execução local usa Neon, não um arquivo SQLite. Caso seu navegador rejeite cookies seguros em uma origem local, use HTTPS local ou teste um deployment autorizado.

## Verificação

```sh
npm test
npm run build
```

Os testes cobrem adaptação da API para Vercel, parâmetros de banco, tipos numéricos e proteção de PDFs. A configuração final deve ser testada no domínio real, com o seu cliente Google e o seu banco Neon.

## Arquivos principais

| Caminho | Função |
| --- | --- |
| `vercel.json` | Build, rotas e cabeçalhos da hospedagem |
| `api/router.js` | Função Node que recebe as rotas da API |
| `worker.mjs` | Regras de estudo, correção e autorização |
| `google-auth.mjs` | Validação do token Google e sessões |
| `middleware.js` | Verificação da sessão antes de servir PDFs |
| `lib/database.js` | Persistência no Neon |
| `db/001-initial.sql` | Tabelas e índice |
| `content.mjs` | Conteúdos e referências |
| `public/` | Interface, estilos, ícone e PDFs |

Os materiais originais foram fornecidos pelo responsável pelo projeto. Sua inclusão não transfere direitos nem concede licença de redistribuição. O pacote não contém credenciais, dados pessoais de alunos, bancos locais ou dependências instaladas.
