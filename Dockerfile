# Start from a rust base image
#FROM rust:1.83.0 as base
FROM rust:1.77-bookworm as base

# Set the current directory
WORKDIR /app

# Copy everthing that is not dockerignored to the image
COPY . .

# Start from base image
FROM base as builder


# Install system dependencies
RUN apt-get update -y && \
    apt-get install -y pkg-config libssl-dev


RUN rustup update stable && \
    rustup default stable && \
    rustup target add wasm32-unknown-unknown

RUN cargo install cargo-make --locked
# Install Node in builder stage
RUN apt-get --yes update && apt-get --yes upgrade
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION v18.16.1
RUN mkdir -p /usr/local/nvm && apt-get update && echo "y" | apt-get install curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
ENV PATH $NODE_PATH:$PATH

# Install dependencies
RUN cargo make deps-wasm
RUN cargo make deps-npm

# Build
RUN cargo make build-server
RUN cargo make build-bindings
RUN cargo make build-app
RUN cargo make build-backend
# # RUN cargo make deps-wasm && \
# #     cargo make deps-npm && \
# #     cargo make build-server && \
# #     cargo make build-bindings && \
# #     cargo make build-app && \
# #     cargo make build-backend

# Final image

# Start from a base image (comes with docker)
FROM nestybox/ubuntu-jammy-systemd-docker:latest

# Install dependencies needed for Rust, Node.js installation and runtime
# Removed dos2unix as we are not using the script anymore
RUN apt-get update && apt-get install -y curl build-essential pkg-config libssl-dev && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Rust (including cargo)
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal

# Install cargo-make
# Use absolute path for cargo here too, just in case PATH isn't immediately available
RUN /usr/local/cargo/bin/cargo install cargo-make --locked

# Install Node.js and npm (using NodeSource)
# Match the version used in the builder stage (v18.x)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory in final image
WORKDIR /app

# Copy the entire built application source (needed for cargo make run)
COPY --from=builder /app/packages/app/dist /app/packages/app/dist
COPY --from=builder /app/target/release/backend /usr/local/bin/backend
# COPY --from=builder /app /app

# Expose backend and frontend ports
EXPOSE 4444
EXPOSE 3000

# Removed script copy/permission steps

# Entrypoint: Embed the startup logic directly using shell form
# Use absolute path for cargo to avoid PATH issues
ENTRYPOINT ["/bin/sh", "-c", "dockerd > /var/log/dockerd.log 2>&1 & sleep 3 && docker pull ghcr.io/hyperledger-solang/solang:latest && /usr/local/cargo/bin/cargo make run"]



# # ##########################################################NEWWWWW###########################################################
# # # Stage 1: Build environment
# # FROM rust:1.77-bookworm as builder

# # WORKDIR /app

# # # Install system dependencies first for better caching
# # RUN apt-get update -y && \
# #     apt-get install -y \
# #     pkg-config \
# #     libssl-dev \
# #     curl \
# #     build-essential

# # # Install Node.js using official NodeSource script
# # RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
# #     apt-get install -y nodejs

# # # Rust setup
# # RUN rustup default stable && \
# #     rustup target add wasm32-unknown-unknown && \
# #     cargo install cargo-make --locked

# # # Copy source files
# # COPY . .

# # # Build dependencies and project
# # RUN cargo make deps-wasm && \
# #     cargo make deps-npm && \
# #     cargo make build-server && \
# #     cargo make build-bindings && \
# #     cargo make build-app && \
# #     cargo make build-backend

# # # Stage 2: Runtime environment
# # FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # # Install runtime dependencies
# # RUN apt-get update -y && \
# #     apt-get install -y \
# #     libssl3 \
# #     ca-certificates

# # # Copy built artifacts from builder
# # COPY --from=builder /app/packages/app/dist /app/packages/app/dist
# # COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# # # Copy and setup entrypoint
# # COPY sysbox/on-start.sh /usr/local/bin/
# # RUN chmod +x /usr/local/bin/on-start.sh

# # # Set proper permissions for systemd
# # RUN mkdir -p /etc/systemd/system/docker.service.d && \
# #     echo -e '[Service]\nEnvironment="DOCKER_OPTS=--iptables=false --ip-masq=false"\n' > /etc/systemd/system/docker.service.d/override.conf

# # ENTRYPOINT ["/usr/local/bin/on-start.sh"]


####################################################OLD DOCKERFILE##########################################################
# # Start from a rust base image
# FROM rust:1.76.0 as base

# # Set the current directory
# WORKDIR /app

# # Copy everthing that is not dockerignored to the image
# COPY . .

# # Start from base image
# FROM base as builder

# # Rust setup
# RUN rustup toolchain install stable
# RUN rustup toolchain install nightly-2024-02-04
# RUN rustup target add wasm32-unknown-unknown
# RUN cargo install cargo-make --locked

# # Install Node
# RUN apt-get --yes update
# RUN apt-get --yes upgrade
# ENV NVM_DIR /usr/local/nvm
# ENV NODE_VERSION v18.16.1
# RUN mkdir -p /usr/local/nvm && apt-get update && echo "y" | apt-get install curl
# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
# ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# ENV PATH $NODE_PATH:$PATH

# # Install dependencies
# RUN cargo make deps-wasm
# RUN cargo make deps-npm

# # Build
# RUN cargo make build-server
# RUN cargo make build-bindings
# RUN cargo make build-app
# RUN cargo make build-backend


# # Final image

# # Start from a base image (comes with docker)
# FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # Copy the built files
# COPY --from=builder /app/packages/app/dist /app/packages/app/dist
# COPY --from=builder /app/target/release/backend /app/target/release/backend

# # Startup scripts
# COPY sysbox/on-start.sh /usr/bin
# RUN chmod +x /usr/bin/on-start.sh

# # Entrypoint
# #ENTRYPOINT [ "on-start.sh" ]
# ENTRYPOINT ["/bin/sh", "-c", "dockerd > /var/log/dockerd.log 2>&1 & sleep 3 && docker pull ghcr.io/hyperledger-solang/solang:latest && cargo make run"]





##################################################MODIFIED DOCKERFILE##########################################################
# # Start from a rust base image
# #FROM rust:1.83.0 as base
# FROM rust:1.77-bookworm as base

# # Set the current directory
# WORKDIR /app

# # Copy everthing that is not dockerignored to the image
# COPY . .

# # Start from base image
# FROM base as builder


# # Install system dependencies
# RUN apt-get update -y && \
#     apt-get install -y pkg-config libssl-dev


# RUN rustup update stable && \
#     rustup default stable && \
#     rustup target add wasm32-unknown-unknown

# RUN cargo install cargo-make --locked
# # Install Node in builder stage
# RUN apt-get --yes update && apt-get --yes upgrade
# ENV NVM_DIR /usr/local/nvm
# ENV NODE_VERSION v18.16.1
# RUN mkdir -p /usr/local/nvm && apt-get update && echo "y" | apt-get install curl
# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
# ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# ENV PATH $NODE_PATH:$PATH

# # Install dependencies
# RUN cargo make deps-wasm
# RUN cargo make deps-npm

# # Build
# RUN cargo make build-server
# RUN cargo make build-bindings
# RUN cargo make build-app
# RUN cargo make build-backend


# # Final image

# # Start from a base image (comes with docker)
# FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # Install dependencies needed for Rust, Node.js installation and runtime
# RUN apt-get update && apt-get install -y curl build-essential pkg-config libssl-dev dos2unix && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Rust (including cargo)
# ENV RUSTUP_HOME=/usr/local/rustup \
#     CARGO_HOME=/usr/local/cargo \
#     PATH=/usr/local/cargo/bin:$PATH
# RUN curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal

# # Install cargo-make
# RUN cargo install cargo-make --locked

# # Install Node.js and npm (using NodeSource)
# # Match the version used in the builder stage (v18.x)
# RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
#     apt-get update && apt-get install -y nodejs && \
#     apt-get clean && rm -rf /var/lib/apt/lists/*

# # Set working directory in final image
# WORKDIR /app

# # Copy built artifacts from builder
# COPY --from=builder /app/packages/app/dist /app/packages/app/dist
# COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# EXPOSE 4444



# # Startup scripts: Copy script, ensure LF endings, and set permissions
# COPY sysbox/on-start.sh /usr/bin/
# RUN dos2unix /usr/bin/on-start.sh && chmod +x /usr/bin/on-start.sh

# # Entrypoint (using the original script that calls cargo make run)
# ENTRYPOINT [ "/usr/bin/on-start.sh" ]



############################################################MODIFIED DOCKERFILE##########################################################
# # Start from a rust base image
# #FROM rust:1.83.0 as base
# FROM rust:1.77-bookworm as base

# # Set the current directory
# WORKDIR /app

# # Copy everthing that is not dockerignored to the image
# COPY . .

# # Start from base image
# FROM base as builder


# # Install system dependencies
# RUN apt-get update -y && \
#     apt-get install -y pkg-config libssl-dev


# RUN rustup update stable && \
#     rustup default stable && \
#     rustup target add wasm32-unknown-unknown

# RUN cargo install cargo-make --locked
# # Install Node in builder stage
# RUN apt-get --yes update && apt-get --yes upgrade
# ENV NVM_DIR /usr/local/nvm
# ENV NODE_VERSION v18.16.1
# RUN mkdir -p /usr/local/nvm && apt-get update && echo "y" | apt-get install curl
# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
# ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# ENV PATH $NODE_PATH:$PATH

# # Install dependencies
# RUN cargo make deps-wasm
# RUN cargo make deps-npm

# # Build
# RUN cargo make build-server
# RUN cargo make build-bindings
# RUN cargo make build-app
# RUN cargo make build-backend

# # --- DEBUGGING STEP --- #
# # List the contents of the frontend directory AFTER the build steps
# RUN echo "--- Listing /app/packages/frontend/ contents after build --- " && ls -la /app/packages/frontend/
# # --- END DEBUGGING STEP --- #


# # Final image

# # Start from a base image (comes with docker)
# FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # Install dependencies needed for Rust, Node.js installation and runtime
# # Removed dos2unix as we are not using the script anymore
# RUN apt-get update && apt-get install -y curl build-essential pkg-config libssl-dev && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Rust (including cargo)
# ENV RUSTUP_HOME=/usr/local/rustup \
#     CARGO_HOME=/usr/local/cargo \
#     PATH=/usr/local/cargo/bin:$PATH
# RUN curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal

# # Install cargo-make
# RUN cargo install cargo-make --locked

# # Install Node.js and npm (using NodeSource)
# # Match the version used in the builder stage (v18.x)
# RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
#     apt-get update && apt-get install -y nodejs && \
#     apt-get clean && rm -rf /var/lib/apt/lists/*

# # Set working directory in final image
# WORKDIR /app

# # Copy the entire built application source (needed for cargo make run)
# COPY --from=builder /app /app

# EXPOSE 4444

# # Removed script copy/permission steps

# # Entrypoint: Embed the startup logic directly using shell form
# # This avoids issues with script file formats (exec format error)
# ENTRYPOINT ["/bin/sh", "-c", "dockerd > /var/log/dockerd.log 2>&1 & sleep 3 && docker pull ghcr.io/hyperledger-solang/solang:latest && cargo make run"]

