Para instalar as dependencias use:

npm i --save

npm config set strict-ssl false

npm init

npm install express --save

npm install ejs --save

npm install express-validator --save

npm install dotenv --save

npm install nodemailer

npm install bcryptjs

npm install bcrypt

npm install multer

## Mercado Pago Checkout Pro

Configure as credenciais do ambiente desejado no `.env` do servidor (nunca no JavaScript público):

```env
MP_PUBLIC_KEY=...
MP_ACCESS_TOKEN=...
MP_CLIENT_ID=...
MP_CLIENT_SECRET=...
APP_BASE_URL=https://seu-dominio.com.br
```

Use uma URL HTTPS pública em `APP_BASE_URL` para habilitar URLs de retorno e notificações; endereços locais como `localhost` são rejeitados pelo Mercado Pago. Sem essa variável, a preferência é criada sem URLs de retorno para permitir abrir o checkout em desenvolvimento, mas a confirmação automática do pedido requer um webhook público. No painel do Mercado Pago, habilite notificações de pagamento para `/pagamentos/mercadopago/webhook`. Use as credenciais de teste e uma conta compradora de teste durante a validação; substitua-as apenas ao publicar em produção.

taskkill /f /im node.exe (para fechar as conexões simultaneas do banco de dados)

