# CW — Site de Organização de Partidas

## PASSO A PASSO COMPLETO (100% GRATUITO)

---

## ETAPA 1 — Ativar Firestore no Firebase

1. Acesse https://console.firebase.google.com/project/cw-app-d72f8/firestore
2. Clique em "Criar banco de dados"
3. Escolha "Iniciar no modo de teste"
4. Região: "southamerica-east1 (São Paulo)"
5. Clique "Ativar"

Depois vá em Firestore > Regras e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Clique "Publicar".

---

## ETAPA 2 — Criar conta e chave no Resend

1. Acesse https://resend.com e crie conta gratuita (Google)
2. No menu lateral: "API Keys" → "Create API Key"
3. Nome: cw-app → permissão "Full access" → criar
4. Copie a chave gerada (começa com re_...)
5. Cole no arquivo .env.local no lugar de: re_COLOQUE_SUA_CHAVE_AQUI

---

## ETAPA 3 — Subir o código no GitHub

1. Acesse https://github.com e crie conta gratuita
2. Clique em "New repository" → nome: cw → "Create repository"
3. Acesse https://github.dev (VS Code no navegador)
4. Abra o repositório criado
5. Suba todos os arquivos desta pasta para o repositório

---

## ETAPA 4 — Deploy na Vercel

1. Acesse https://vercel.com e entre com sua conta GitHub
2. Clique "Add New Project"
3. Selecione o repositório "cw"
4. Em "Environment Variables", adicione todas as variáveis do .env.local:
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   - NEXT_PUBLIC_FIREBASE_APP_ID
   - RESEND_API_KEY (a chave que você criou no passo 2)
   - NEXT_PUBLIC_BASE_URL (preencha com a URL da Vercel após o deploy)
5. Clique "Deploy"
6. Aguarde ~2 minutos
7. Copie a URL gerada (ex: cw-app.vercel.app)
8. Volte nas variáveis de ambiente da Vercel e atualize NEXT_PUBLIC_BASE_URL com essa URL
9. Faça um novo deploy (Deployments > Redeploy)

---

## ETAPA 5 — Distribuir para o grupo

Mande o link no WhatsApp! Funciona em:
- ✅ iPhone (Safari, Chrome)
- ✅ Android (Chrome, qualquer navegador)
- ✅ PC

Dica: cada pessoa pode adicionar o site na tela inicial do celular como se fosse um app:
- iPhone: Safari → compartilhar → "Adicionar à Tela de Início"
- Android: Chrome → menu (3 pontos) → "Adicionar à tela inicial"

---

## FUNCIONALIDADES

- ✅ Cadastro por nome + email (sem senha)
- ✅ Preferências de notificação individuais
- ✅ Abrir CW com formato 3v3 a 7v7
- ✅ Horário automático (hora cheia ou meia)
- ✅ Lista de confirmados em tempo real
- ✅ Fila de espera com prioridade automática
- ✅ Bloqueio de entrada 10 min antes
- ✅ Bloqueio total 5 min antes
- ✅ Promoção automática da fila quando alguém sai
- ✅ Sorteio de times (opcional)
- ✅ Mural de avisos com cooldown de 1 min
- ✅ Emails automáticos (nova CW, falta 1 vaga, CW fechada)
- ✅ Funciona em iPhone, Android e PC

---

## ESTRUTURA DO PROJETO

```
cw-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx           ← Layout raiz
│   │   ├── page.tsx             ← Home (lista de CWs)
│   │   ├── globals.css
│   │   ├── cw/[id]/page.tsx    ← Detalhe da CW
│   │   └── api/
│   │       └── send-email/      ← API de envio de email
│   ├── components/
│   │   ├── PlayerProvider.tsx   ← Contexto do jogador
│   │   ├── LoginModal.tsx       ← Modal de entrada
│   │   ├── NewCWModal.tsx       ← Modal de abrir CW
│   │   ├── CWCard.tsx           ← Card da home
│   │   ├── JoinModal.tsx        ← Modal de entrar na CW
│   │   └── MuralDrawer.tsx      ← Gaveta do mural
│   ├── lib/
│   │   ├── firebase.ts          ← Config Firebase
│   │   ├── cwService.ts         ← Lógica e banco de dados
│   │   └── emailService.ts      ← Templates e envio de email
│   └── types/
│       └── index.ts             ← Tipos TypeScript
├── .env.local                   ← Variáveis de ambiente
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```
