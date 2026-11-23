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

Em produção no Render, a aplicação usa automaticamente `RENDER_EXTERNAL_URL` para configurar o botão de retorno e o redirecionamento automático do Checkout Pro. Em desenvolvimento local, configure `APP_BASE_URL` com um túnel HTTPS público (localhost não pode receber o retorno do Mercado Pago). A preferência também configura a notificação de pagamento no webhook `/pagamentos/mercadopago/webhook`. A área “Meus ingressos” consulta pagamentos pendentes diretamente no Mercado Pago para recuperar aprovações mesmo se o navegador não retornar ao site. Use as credenciais de teste e uma conta compradora de teste durante a validação; substitua-as apenas ao publicar em produção.

taskkill /f /im node.exe (para fechar as conexões simultaneas do banco de dados)

