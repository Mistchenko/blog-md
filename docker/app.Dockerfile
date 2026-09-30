FROM node:24-alpine

# node_modules живут в образе в /opt/node_modules, код монтируется в /opt/app:
# Node находит модули, поднимаясь по дереву каталогов, и в рабочей директории
# на хосте node_modules не появляется
WORKDIR /opt
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

ENV PATH=/opt/node_modules/.bin:$PATH \
    VITE_CACHE_DIR=/opt/.vite

WORKDIR /opt/app
EXPOSE 5173
CMD ["npm", "run", "dev"]
