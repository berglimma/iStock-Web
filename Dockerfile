FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
RUN npm install
COPY . .

# Firebase (sincronização iOS) — injetado no build do frontend
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN=istock-4771d.firebaseapp.com
ARG VITE_FIREBASE_PROJECT_ID=istock-4771d
ARG VITE_FIREBASE_STORAGE_BUCKET=istock-4771d.firebasestorage.app
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=60021957882
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID

RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/app/data/istock.db
ENV DATABASE_BACKUP_PATH=/data/backups/istock.db
ENV UPLOAD_DIR=/data/uploads
ENV APP_URL=https://www.istockbl.com.br
ENV CORS_ORIGIN=https://www.istockbl.com.br,https://istockbl.com.br
ENV DATA_STORE=firestore
ENV FIREBASE_PROJECT_ID=istock-4771d
ENV FIRESTORE_DATABASE_ID=istock
ENV FIREBASE_STORAGE_BUCKET=istock-4771d.firebasestorage.app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
RUN npm install --omit=dev -w backend

RUN mkdir -p /app/data /data/uploads /data/backups

EXPOSE 8080
VOLUME ["/data"]

CMD ["node", "backend/dist/index.js"]
