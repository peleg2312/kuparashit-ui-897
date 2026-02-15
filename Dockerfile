FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Optional build-time API endpoints for Vite.
ARG VITE_MAIN_API_BASE_URL
ARG VITE_KPR_API_BASE_URL
ARG VITE_EXCH_API_BASE_URL
ENV VITE_MAIN_API_BASE_URL=$VITE_MAIN_API_BASE_URL
ENV VITE_KPR_API_BASE_URL=$VITE_KPR_API_BASE_URL
ENV VITE_EXCH_API_BASE_URL=$VITE_EXCH_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
