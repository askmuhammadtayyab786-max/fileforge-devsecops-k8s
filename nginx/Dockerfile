# Step 1: Base image matches your Chainguard workflow
FROM cgr.dev/chainguard/nginx:latest

# Step 2: Copy the custom reverse proxy configuration into Chainguard's config path
COPY nginx.conf /etc/nginx/nginx.conf

# Step 3: Expose unprivileged port 8080 (as defined in nginx.conf)
EXPOSE 8080

# Step 4: Run Nginx in the foreground
ENTRYPOINT ["nginx", "-g", "daemon off;"]
