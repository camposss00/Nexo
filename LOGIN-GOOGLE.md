# Ativar a entrada com Google

A entrada usa Google Identity Services. O servidor verifica o token Google, cria uma sessão em cookie seguro e mantém o histórico separado por aluno.

1. Abra o [Google Auth Platform](https://console.cloud.google.com/auth/overview) e selecione ou crie um projeto para o Nexo.
2. Configure a identidade do app, o e-mail de suporte e o público externo, se alunos de diferentes contas Google forem usar o app. No modo de testes, adicione as contas de teste; para acesso geral, siga a publicação e os requisitos exibidos pelo Google.
3. Em **Clientes**, crie um cliente OAuth do tipo **Aplicativo da Web**.
4. Em **Origens JavaScript autorizadas**, adicione a origem exata do Nexo publicado, com `https://` e sem caminho ou barra final. Para desenvolvimento, adicione a origem exata exibida pelo `vercel dev`, por exemplo `http://localhost:3000`, se essa for a porta usada.
5. Copie o **ID do cliente**, que termina em `.apps.googleusercontent.com`, para a variável de ambiente `GOOGLE_CLIENT_ID` da hospedagem. Esse identificador é público. Este fluxo não utiliza o segredo do cliente OAuth.
6. Configure `GOOGLE_SESSION_SECRET` como segredo da hospedagem, com um valor aleatório de pelo menos 32 caracteres. Nunca coloque esse valor no código ou no Git.
7. Publique a versão com as variáveis configuradas e teste a entrada com uma conta de aluno.

O popup retorna um token ao navegador, que o envia por HTTPS para `/api/auth/google`; não há URI de redirecionamento OAuth neste fluxo. O servidor exige origem correspondente e nonce de curta duração, verifica emissor, público, validade e assinatura, e então emite a sessão. Perfis e resultados ficam no banco Neon Postgres.

Sem o ID e o segredo configurados, o botão fica indisponível e os conteúdos protegidos não são liberados. Testes locais com chaves de teste não substituem o teste final com o cliente Google real e o domínio autorizado.

A tela de entrada precisa ser acessível aos alunos na política da hospedagem. Uma publicação privada restrita ao dono é apenas uma prévia; não atende à distribuição para todos os alunos.
