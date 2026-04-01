# Build React frontend
FROM node:22-alpine AS web-build
WORKDIR /web
COPY chronicle-web/package*.json ./
RUN npm ci
COPY chronicle-web/ .
RUN npm run build

# Build .NET API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Chronicle.Api/Chronicle.Api.csproj", "."]
RUN dotnet restore
COPY Chronicle.Api/ .
RUN dotnet publish -c Release -o /app/publish

# Copy React build into wwwroot so ASP.NET serves it as static files
FROM build AS publish
COPY --from=web-build /web/dist /app/publish/wwwroot

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Chronicle.Api.dll"]
