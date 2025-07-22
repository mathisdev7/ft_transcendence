FROM node:22-alpine

RUN apk add --no-cache sqlite

WORKDIR /app

COPY package.json ./

RUN npm cache clean --force && npm install

COPY . .

RUN if [ -f ".env" ]; then echo "Fichier .env trouvé et copié"; else echo "Aucun fichier .env trouvé, utilisation des variables d'environnement Docker"; fi

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

CMD ["npm", "start"]
