# Nexo · Site de estudos

Site que funciona diretamente no navegador, sem login, API ou banco de dados.

## Abrir

Abra o arquivo `index.html` fornecido no pacote. Não é preciso instalar nada. Os resumos, flashcards e treinos funcionam sem internet. As referências e os cadernos originais do Drive precisam de conexão e podem exigir acesso à pasta.

O progresso é salvo somente no navegador usado. Limpar os dados desse navegador apaga o histórico. Se o navegador bloquear o armazenamento, os dados ficam apenas na sessão.

## Conteúdo

40 resumos, 120 flashcards, 30 questões autorais com correção, 10 links de provas oficiais e 5 propostas de redação. Trata-se de uma coleção inicial, com cobertura descrita na biblioteca.

## Fonte

`site/index.template.html` contém a interface. `content.mjs` contém os materiais. `node build-simple.mjs` gera `dist/index.html` e copia os PDFs. Essa etapa é opcional para quem recebe o HTML pronto.

As migrações de `drizzle/` registram uma versão anterior do projeto e não são usadas pelo site atual. Não há conexão com banco de dados nem serviços de autenticação na versão atual.
