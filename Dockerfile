# Stage 1: Build environment
FROM rust:1.83.0 as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install NVM
ENV NVM_DIR /usr/local/nvm
RUN mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Set up Rust environment
RUN rustup default stable && \
    rustup target add wasm32-unknown-unknown

# Install Node.js
ENV NODE_VERSION v20.14.0
RUN . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use $NODE_VERSION

# Install cargo-make
RUN . $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    cargo install cargo-make --locked

WORKDIR /app

# Copy only necessary files for dependency installation
COPY Cargo.toml Cargo.lock Makefile.toml ./
COPY packages/frontend/package.json packages/frontend/package-lock.json ./packages/frontend/

# Install frontend dependencies
RUN . $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    cd packages/frontend && \
    npm ci

# Copy the rest of the source code
COPY . .

# Build the application (with corrected paths)
# Build the application
RUN . $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    cargo make deps-wasm && \
    cargo make build-backend && \
    echo "Building frontend app..." && \
    (cd packages/frontend && npm run build) && \
    echo "Building frontend production bundle..." && \
    (cd packages/frontend && npm run build) && \
    cargo make build-bindings


# Stage 2: Final runtime image
FROM nestybox/ubuntu-jammy-systemd-docker:latest

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    curl \
    dos2unix \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/target/release/backend ./target/release/
COPY --from=builder /app/packages/frontend/.next ./packages/frontend/.next
COPY --from=builder /app/packages/frontend/node_modules ./packages/frontend/node_modules

# Create symbolic link for frontend dist
RUN mkdir -p /app/packages/app && \
    ln -s /app/packages/frontend/.next /app/packages/app/dist

# Copy scripts
COPY sysbox/on-start.sh /usr/local/bin/on-start.sh
COPY start-services.sh /app/start-services.sh

# Fix permissions and line endings
RUN dos2unix /usr/local/bin/on-start.sh /app/start-services.sh && \
    chmod +x /usr/local/bin/on-start.sh /app/start-services.sh

EXPOSE 4444 3000
ENTRYPOINT ["/usr/local/bin/on-start.sh"]























# # Stage 1: Build environment
# # Use a specific Rust version for consistency
# FROM rust:1.83.0 as builder

# WORKDIR /app
# COPY . .

# # Install frontend dependencies using the root package-lock.json
# RUN bash -c "source $NVM_DIR/nvm.sh && cd packages/frontend && npm ci --prefix ."

# # Install build dependencies: pkg-config, libssl-dev, curl
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     pkg-config \
#     libssl-dev \
#     curl \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Node.js using NVM
# ENV NVM_DIR /usr/local/nvm
# ENV NODE_VERSION v20.14.0
# RUN mkdir -p $NVM_DIR && \
#     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
#     . $NVM_DIR/nvm.sh && \
#     nvm install $NODE_VERSION && \
#     nvm use --delete-prefix $NODE_VERSION && \
#     nvm alias default $NODE_VERSION && \
#     nvm cache clear

# # Set up Rust environment
# RUN rustup default stable && \
#     rustup target add wasm32-unknown-unknown

# # Install cargo-make
# RUN cargo install cargo-make --locked

# # Copy source code
# COPY . .

# # Install dependencies (npm and wasm)
# RUN bash -c "source $NVM_DIR/nvm.sh && cargo make deps-npm"
# RUN cargo make deps-wasm

# # Build the application (backend, frontend, etc.)
# RUN cargo make build-server
# RUN cargo make build-bindings
# RUN bash -c "source $NVM_DIR/nvm.sh && cargo make build-app"
# RUN bash -c "source $NVM_DIR/nvm.sh && cargo make build-frontend" 
# RUN cargo make build-backend

# # --- Optional: Debug listing --- 
# # RUN echo "--- Listing build outputs --- " && \
# #     ls -la /app/target/release/ && \
# #     ls -la /app/packages/frontend/.next/

# # # Stage 2: Final runtime image
# # FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # # Install runtime dependencies: libssl3, curl, dos2unix, and Node.js
# # RUN apt-get update && apt-get install -y --no-install-recommends \
# #     libssl3 \
# #     curl \
# #     dos2unix \
# #     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # # Install Node.js (same compatible version as builder stage)
# # # Using NodeSource method for simplicity in final image
# # RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
# #     apt-get update && apt-get install -y nodejs && \
# #     apt-get clean && rm -rf /var/lib/apt/lists/*

# # # Install Rust and cargo-make (needed for `cargo make run`)
# # ENV RUSTUP_HOME=/usr/local/rustup \
# #     CARGO_HOME=/usr/local/cargo \
# #     PATH=/usr/local/cargo/bin:$PATH
# # RUN curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
# # RUN /usr/local/cargo/bin/cargo install cargo-make --locked

# # WORKDIR /app

# # # Copy the entire built application source from the builder stage
# # # This is needed because `cargo make run` needs the source code, Makefiles, etc.
# # COPY --from=builder /app /app

# # # Copy the startup script
# # COPY sysbox/on-start.sh /usr/local/bin/on-start.sh

# # # Ensure script has correct line endings and is executable
# # RUN dos2unix /usr/local/bin/on-start.sh && chmod +x /usr/local/bin/on-start.sh

# # # Expose both backend and frontend ports
# # EXPOSE 4444
# # EXPOSE 3000

# # # Set the entrypoint to the startup script
# # ENTRYPOINT ["/usr/local/bin/on-start.sh"]


# # Stage 2: Final runtime image
# FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # Install runtime dependencies
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     libssl3 \
#     curl \
#     dos2unix \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Node.js
# RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
#     apt-get update && apt-get install -y nodejs && \
#     apt-get clean && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Copy built artifacts from builder
# COPY --from=builder /app/target/release/backend ./target/release/
# COPY --from=builder /app/packages/frontend/package.json ./packages/frontend/
# COPY --from=builder /app/packages/frontend/package-lock.json ./packages/frontend/
# COPY --from=builder /app/packages/frontend/.next ./packages/frontend/.next

# # Copy node_modules from builder stage (CRITICAL FIX)
# COPY --from=builder /app/packages/frontend/node_modules ./packages/frontend/node_modules

# # Copy both scripts
# COPY sysbox/on-start.sh /usr/local/bin/on-start.sh
# COPY start-services.sh /app/start-services.sh

# # Fix permissions and line endings
# RUN dos2unix /usr/local/bin/on-start.sh /app/start-services.sh && \
#     chmod +x /usr/local/bin/on-start.sh /app/start-services.sh

# EXPOSE 4444 3000
# ENTRYPOINT ["/usr/local/bin/on-start.sh"]




























# # Stage 1: Build environment
# # Use a specific Rust version for consistency, closer to solang-playground
# FROM rust:1.83.0 as builder

# WORKDIR /app

# # Install build dependencies: pkg-config, libssl-dev, curl
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     pkg-config \
#     libssl-dev \
#     curl \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Node.js using NVM (matching user's original approach)
# ENV NVM_DIR /usr/local/nvm
# ENV NODE_VERSION v20.14.0
# RUN mkdir -p $NVM_DIR && \
#     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
#     /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION && nvm alias default $NODE_VERSION && nvm cache clear"
# ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# ENV PATH $NODE_PATH:$PATH

# # Set up Rust environment
# RUN rustup default stable && \
#     rustup target add wasm32-unknown-unknown

# # Install cargo-make
# RUN cargo install cargo-make --locked

# # Copy source code
# COPY . .

# # Install dependencies (npm and wasm)
# # Source NVM environment before running cargo make commands that use npm
# RUN bash -c "source $NVM_DIR/nvm.sh && cargo make deps-npm"
# RUN cargo make deps-wasm

# # Build the application
# # Source NVM environment before running cargo make commands that use npm
# # Ensure build-frontend runs `npm run export` successfully
# RUN cargo make build-server
# RUN cargo make build-bindings
# RUN bash -c "source $NVM_DIR/nvm.sh && cargo make build-app" # Keep if needed for wasm/other parts
# RUN bash -c "source $NVM_DIR/nvm.sh && cargo make build-frontend" # This now runs `npm run export`
# RUN cargo make build-backend

# # --- Optional: Debug listing --- 
# # RUN echo "--- Listing build outputs --- " && \
# #     ls -la /app/target/release/ && \
# #     ls -la /app/packages/frontend/out/ # Check the export output directory

# # Stage 2: Final runtime image
# FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # Install runtime dependencies: libssl3 (runtime counterpart for libssl-dev), dos2unix
# # Node.js is NO LONGER needed here
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     libssl3 \
#     dos2unix \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Copy necessary built artifacts from the builder stage
# COPY --from=builder /app/target/release/backend /app/backend
# # Updated: Copy the static export output from the frontend build
# COPY --from=builder /app/packages/frontend/out /app/frontend_dist 

# # Copy the startup script
# COPY sysbox/on-start.sh /usr/local/bin/on-start.sh

# # Ensure script has correct line endings and is executable
# RUN dos2unix /usr/local/bin/on-start.sh && chmod +x /usr/local/bin/on-start.sh

# # Expose only the backend port
# EXPOSE 4444

# # Set the entrypoint to the startup script (will be updated to just run backend)
# ENTRYPOINT ["/usr/local/bin/on-start.sh"]
























# # Stage 1: Build environment
# FROM rust:1.77-bookworm as builder

# WORKDIR /app

# # Install build dependencies: pkg-config, libssl-dev, curl
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     pkg-config \
#     libssl-dev \
#     curl \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Node.js using NVM (Use a compatible version, e.g., 20.x)
# ENV NVM_DIR /usr/local/nvm
# ENV NODE_VERSION v20.14.0
# RUN mkdir -p $NVM_DIR && \
#     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
#     /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION && nvm alias default $NODE_VERSION && nvm cache clear"
# ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# ENV PATH $NODE_PATH:$PATH

# # Set up Rust environment
# RUN rustup default stable && \
#     rustup target add wasm32-unknown-unknown

# # Install cargo-make
# RUN cargo install cargo-make --locked

# # Copy source code
# COPY . .

# # Install dependencies (npm and wasm)
# RUN cargo make deps-npm
# RUN cargo make deps-wasm

# # Build the application
# # Ensure build-frontend runs `next build` successfully
# RUN cargo make build-server
# RUN cargo make build-bindings
# RUN cargo make build-frontend # This should run `npm run build --workspace=packages/frontend`
# RUN cargo make build-backend

# # --- Optional: Debug listing --- 
# # RUN echo "--- Listing build outputs --- " && \
# #     ls -la /app/target/release/ && \
# #     ls -la /app/packages/frontend/.next/

# # Stage 2: Final runtime image
# FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # Install runtime dependencies: libssl3, Node.js, dos2unix
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     libssl3 \
#     curl \
#     dos2unix \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Node.js (same compatible version as builder stage)
# # Using NodeSource method for simplicity in final image
# RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
#     apt-get update && apt-get install -y nodejs && \
#     apt-get clean && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Copy necessary built artifacts from the builder stage
# COPY --from=builder /app/target/release/backend /app/backend

# # Copy the entire frontend package directory (including .next, node_modules, package.json)
# COPY --from=builder /app/packages/frontend /app/packages/frontend

# # Copy the startup script
# COPY sysbox/on-start.sh /usr/local/bin/on-start.sh

# # Ensure script has correct line endings and is executable
# RUN dos2unix /usr/local/bin/on-start.sh && chmod +x /usr/local/bin/on-start.sh

# # Expose both backend and frontend ports
# EXPOSE 4444
# EXPOSE 3000

# # Set the entrypoint to the startup script
# ENTRYPOINT ["/usr/local/bin/on-start.sh"]


















































# # Stage 1: Build environment
# # Use a specific Rust version for consistency
# FROM rust:1.77-bookworm as builder

# WORKDIR /app

# # Install build dependencies: pkg-config, libssl-dev (for Rust builds), curl (for nvm)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     pkg-config \
#     libssl-dev \
#     curl \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Node.js using NVM (matching user's original approach)
# ENV NVM_DIR /usr/local/nvm
# ENV NODE_VERSION v18.16.1
# RUN mkdir -p $NVM_DIR && \
#     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
#     /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION && nvm alias default $NODE_VERSION && nvm cache clear"
# ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# ENV PATH $NODE_PATH:$PATH

# # Set up Rust environment
# RUN rustup default stable && \
#     rustup target add wasm32-unknown-unknown

# # Install cargo-make
# RUN cargo install cargo-make --locked

# # Copy source code
# COPY . .

# # Install dependencies (npm and wasm)
# RUN cargo make deps-npm
# RUN cargo make deps-wasm

# # Build the application (backend, frontend, etc.)
# RUN cargo make build-server
# RUN cargo make build-bindings
# # RUN cargo make build-app # Assuming this isn't needed if frontend is separate
# RUN cargo make build-frontend # This should run 'npm run export --workspace=packages/frontend'
# RUN cargo make build-backend

# # --- Optional: Add debug listing here if build issues persist ---
# # RUN echo "--- Listing build outputs --- " && \
# #     ls -la /app/target/release/ && \
# #     ls -la /app/packages/frontend/out/

# # Stage 2: Final runtime image
# FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # Install runtime dependencies: libssl3 (runtime counterpart for libssl-dev), dos2unix
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     libssl3 \
#     dos2unix \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Copy necessary built artifacts from the builder stage
# COPY --from=builder /app/target/release/backend /app/backend
# # Updated: Copy the static export output from the frontend build
# COPY --from=builder /app/packages/frontend/out /app/frontend_dist

# # Copy the startup script
# COPY sysbox/on-start.sh /usr/local/bin/on-start.sh

# # Ensure script has correct line endings and is executable
# RUN dos2unix /usr/local/bin/on-start.sh && chmod +x /usr/local/bin/on-start.sh

# # Expose the backend port
# EXPOSE 4444
# EXPOSE 3000

# # Set the entrypoint to the startup script
# ENTRYPOINT ["/usr/local/bin/on-start.sh"]























































# # Stage 1: Build environment
# # Use a specific Rust version for consistency
# FROM rust:1.77-bookworm as builder

# WORKDIR /app

# # Install build dependencies: pkg-config, libssl-dev (for Rust builds), curl (for nvm)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     pkg-config \
#     libssl-dev \
#     curl \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Node.js using NVM (matching user's original approach)
# ENV NVM_DIR /usr/local/nvm
# ENV NODE_VERSION v18.16.1
# RUN mkdir -p $NVM_DIR && \
#     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
#     /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION && nvm alias default $NODE_VERSION && nvm cache clear"
# ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# ENV PATH $NODE_PATH:$PATH

# # Set up Rust environment
# # Using stable toolchain. Assuming nightly isn't strictly required for the build.
# # If nightly is needed, add: RUN rustup toolchain install nightly-YYYY-MM-DD && rustup component add rust-src --toolchain nightly-YYYY-MM-DD
# RUN rustup default stable && \
#     rustup target add wasm32-unknown-unknown

# # Install cargo-make
# RUN cargo install cargo-make --locked

# # Copy source code
# # Copy package.json files first for better layer caching if possible
# # COPY package.json ./package.json
# # COPY package-lock.json ./package-lock.json
# # COPY packages/app/package.json ./packages/app/package.json
# # ... etc for other package.json files ...
# # COPY Cargo.toml ./Cargo.toml
# # COPY Cargo.lock ./Cargo.lock
# # COPY crates/backend/Cargo.toml ./crates/backend/Cargo.toml
# # ... etc for other Cargo.toml files ...
# # Then copy the rest
# COPY . .

# # Install dependencies (npm and wasm)
# # Ensure npm install runs correctly
# RUN cargo make deps-npm
# RUN cargo make deps-wasm

# # Build the application (backend, frontend, etc.)
# # Ensure these steps successfully create the outputs
# RUN cargo make build-server
# RUN cargo make build-bindings
# RUN cargo make build-app # This should create packages/app/dist
# RUN cargo make build-backend # This should create target/release/backend

# # --- Optional: Add debug listing here if build issues persist ---
# # RUN echo "--- Listing build outputs --- " && \
# #     ls -la /app/target/release/ && \
# #     ls -la /app/packages/app/dist/

# # Stage 2: Final runtime image
# FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # Install runtime dependencies: libssl3 (runtime counterpart for libssl-dev), dos2unix
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     libssl3 \
#     dos2unix \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Copy necessary built artifacts from the builder stage
# COPY --from=builder /app/target/release/backend /app/backend
# COPY --from=builder /app/packages/app/dist /app/frontend_dist

# # Copy the startup script
# COPY sysbox/on-start.sh /usr/local/bin/on-start.sh

# # Ensure script has correct line endings and is executable
# RUN dos2unix /usr/local/bin/on-start.sh && chmod +x /usr/local/bin/on-start.sh

# # Expose the backend port
# EXPOSE 4444
# # Expose 3000 only if you intend to access the Next.js dev server directly (unlikely with this setup)
# # EXPOSE 3000

# # Set the entrypoint to the startup script
# ENTRYPOINT ["/usr/local/bin/on-start.sh"]



























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
# # # RUN cargo make deps-wasm && \
# # #     cargo make deps-npm && \
# # #     cargo make build-server && \
# # #     cargo make build-bindings && \
# # #     cargo make build-app && \
# # #     cargo make build-backend

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
# # Use absolute path for cargo here too, just in case PATH isn't immediately available
# RUN /usr/local/cargo/bin/cargo install cargo-make --locked

# # Install Node.js and npm (using NodeSource)
# # Match the version used in the builder stage (v18.x)
# RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
#     apt-get update && apt-get install -y nodejs && \
#     apt-get clean && rm -rf /var/lib/apt/lists/*

# # Set working directory in final image
# WORKDIR /app

# # Copy the entire built application source (needed for cargo make run)
# COPY --from=builder /app/packages/app/dist /app/packages/app/dist
# COPY --from=builder /app/target/release/backend /usr/local/bin/backend
# # COPY --from=builder /app /app

# # Expose backend and frontend ports
# EXPOSE 4444
# EXPOSE 3000

# # Removed script copy/permission steps

# # Entrypoint: Embed the startup logic directly using shell form
# # Use absolute path for cargo to avoid PATH issues
# ENTRYPOINT ["/bin/sh", "-c", "dockerd > /var/log/dockerd.log 2>&1 & sleep 3 && docker pull ghcr.io/hyperledger-solang/solang:latest && /usr/local/cargo/bin/cargo make run"]



# # # ##########################################################NEWWWWW###########################################################
# # # # Stage 1: Build environment
# # # FROM rust:1.77-bookworm as builder

# # # WORKDIR /app

# # # # Install system dependencies first for better caching
# # # RUN apt-get update -y && \
# # #     apt-get install -y \
# # #     pkg-config \
# # #     libssl-dev \
# # #     curl \
# # #     build-essential

# # # # Install Node.js using official NodeSource script
# # # RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
# # #     apt-get install -y nodejs

# # # # Rust setup
# # # RUN rustup default stable && \
# # #     rustup target add wasm32-unknown-unknown && \
# # #     cargo install cargo-make --locked

# # # # Copy source files
# # # COPY . .

# # # # Build dependencies and project
# # # RUN cargo make deps-wasm && \
# # #     cargo make deps-npm && \
# # #     cargo make build-server && \
# # #     cargo make build-bindings && \
# # #     cargo make build-app && \
# # #     cargo make build-backend

# # # # Stage 2: Runtime environment
# # # FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # # # Install runtime dependencies
# # # RUN apt-get update -y && \
# # #     apt-get install -y \
# # #     libssl3 \
# # #     ca-certificates

# # # # Copy built artifacts from builder
# # # COPY --from=builder /app/packages/app/dist /app/packages/app/dist
# # # COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# # # # Copy and setup entrypoint
# # # COPY sysbox/on-start.sh /usr/local/bin/
# # # RUN chmod +x /usr/local/bin/on-start.sh

# # # # Set proper permissions for systemd
# # # RUN mkdir -p /etc/systemd/system/docker.service.d && \
# # #     echo -e '[Service]\nEnvironment="DOCKER_OPTS=--iptables=false --ip-masq=false"\n' > /etc/systemd/system/docker.service.d/override.conf

# # # ENTRYPOINT ["/usr/local/bin/on-start.sh"]


# ####################################################OLD DOCKERFILE##########################################################
# # # Start from a rust base image
# # FROM rust:1.76.0 as base

# # # Set the current directory
# # WORKDIR /app

# # # Copy everthing that is not dockerignored to the image
# # COPY . .

# # # Start from base image
# # FROM base as builder

# # # Rust setup
# # RUN rustup toolchain install stable
# # RUN rustup toolchain install nightly-2024-02-04
# # RUN rustup target add wasm32-unknown-unknown
# # RUN cargo install cargo-make --locked

# # # Install Node
# # RUN apt-get --yes update
# # RUN apt-get --yes upgrade
# # ENV NVM_DIR /usr/local/nvm
# # ENV NODE_VERSION v18.16.1
# # RUN mkdir -p /usr/local/nvm && apt-get update && echo "y" | apt-get install curl
# # RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# # RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
# # ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# # ENV PATH $NODE_PATH:$PATH

# # # Install dependencies
# # RUN cargo make deps-wasm
# # RUN cargo make deps-npm

# # # Build
# # RUN cargo make build-server
# # RUN cargo make build-bindings
# # RUN cargo make build-app
# # RUN cargo make build-backend


# # # Final image

# # # Start from a base image (comes with docker)
# # FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # # Copy the built files
# # COPY --from=builder /app/packages/app/dist /app/packages/app/dist
# # COPY --from=builder /app/target/release/backend /app/target/release/backend

# # # Startup scripts
# # COPY sysbox/on-start.sh /usr/bin
# # RUN chmod +x /usr/bin/on-start.sh

# # # Entrypoint
# # #ENTRYPOINT [ "on-start.sh" ]
# # ENTRYPOINT ["/bin/sh", "-c", "dockerd > /var/log/dockerd.log 2>&1 & sleep 3 && docker pull ghcr.io/hyperledger-solang/solang:latest && cargo make run"]





# ##################################################MODIFIED DOCKERFILE##########################################################
# # # Start from a rust base image
# # #FROM rust:1.83.0 as base
# # FROM rust:1.77-bookworm as base

# # # Set the current directory
# # WORKDIR /app

# # # Copy everthing that is not dockerignored to the image
# # COPY . .

# # # Start from base image
# # FROM base as builder


# # # Install system dependencies
# # RUN apt-get update -y && \
# #     apt-get install -y pkg-config libssl-dev


# # RUN rustup update stable && \
# #     rustup default stable && \
# #     rustup target add wasm32-unknown-unknown

# # RUN cargo install cargo-make --locked
# # # Install Node in builder stage
# # RUN apt-get --yes update && apt-get --yes upgrade
# # ENV NVM_DIR /usr/local/nvm
# # ENV NODE_VERSION v18.16.1
# # RUN mkdir -p /usr/local/nvm && apt-get update && echo "y" | apt-get install curl
# # RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# # RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
# # ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# # ENV PATH $NODE_PATH:$PATH

# # # Install dependencies
# # RUN cargo make deps-wasm
# # RUN cargo make deps-npm

# # # Build
# # RUN cargo make build-server
# # RUN cargo make build-bindings
# # RUN cargo make build-app
# # RUN cargo make build-backend


# # # Final image

# # # Start from a base image (comes with docker)
# # FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # # Install dependencies needed for Rust, Node.js installation and runtime
# # RUN apt-get update && apt-get install -y curl build-essential pkg-config libssl-dev dos2unix && apt-get clean && rm -rf /var/lib/apt/lists/*

# # # Install Rust (including cargo)
# # ENV RUSTUP_HOME=/usr/local/rustup \
# #     CARGO_HOME=/usr/local/cargo \
# #     PATH=/usr/local/cargo/bin:$PATH
# # RUN curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal

# # # Install cargo-make
# # RUN cargo install cargo-make --locked

# # # Install Node.js and npm (using NodeSource)
# # # Match the version used in the builder stage (v18.x)
# # RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
# #     apt-get update && apt-get install -y nodejs && \
# #     apt-get clean && rm -rf /var/lib/apt/lists/*

# # # Set working directory in final image
# # WORKDIR /app

# # # Copy built artifacts from builder
# # COPY --from=builder /app/packages/app/dist /app/packages/app/dist
# # COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# # EXPOSE 4444



# # # Startup scripts: Copy script, ensure LF endings, and set permissions
# # COPY sysbox/on-start.sh /usr/bin/
# # RUN dos2unix /usr/bin/on-start.sh && chmod +x /usr/bin/on-start.sh

# # # Entrypoint (using the original script that calls cargo make run)
# # ENTRYPOINT [ "/usr/bin/on-start.sh" ]



# ############################################################MODIFIED DOCKERFILE##########################################################
# # # Start from a rust base image
# # #FROM rust:1.83.0 as base
# # FROM rust:1.77-bookworm as base

# # # Set the current directory
# # WORKDIR /app

# # # Copy everthing that is not dockerignored to the image
# # COPY . .

# # # Start from base image
# # FROM base as builder


# # # Install system dependencies
# # RUN apt-get update -y && \
# #     apt-get install -y pkg-config libssl-dev


# # RUN rustup update stable && \
# #     rustup default stable && \
# #     rustup target add wasm32-unknown-unknown

# # RUN cargo install cargo-make --locked
# # # Install Node in builder stage
# # RUN apt-get --yes update && apt-get --yes upgrade
# # ENV NVM_DIR /usr/local/nvm
# # ENV NODE_VERSION v18.16.1
# # RUN mkdir -p /usr/local/nvm && apt-get update && echo "y" | apt-get install curl
# # RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# # RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
# # ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# # ENV PATH $NODE_PATH:$PATH

# # # Install dependencies
# # RUN cargo make deps-wasm
# # RUN cargo make deps-npm

# # # Build
# # RUN cargo make build-server
# # RUN cargo make build-bindings
# # RUN cargo make build-app
# # RUN cargo make build-backend

# # # --- DEBUGGING STEP --- #
# # # List the contents of the frontend directory AFTER the build steps
# # RUN echo "--- Listing /app/packages/frontend/ contents after build --- " && ls -la /app/packages/frontend/
# # # --- END DEBUGGING STEP --- #


# # # Final image

# # # Start from a base image (comes with docker)
# # FROM nestybox/ubuntu-jammy-systemd-docker:latest

# # # Install dependencies needed for Rust, Node.js installation and runtime
# # # Removed dos2unix as we are not using the script anymore
# # RUN apt-get update && apt-get install -y curl build-essential pkg-config libssl-dev && apt-get clean && rm -rf /var/lib/apt/lists/*

# # # Install Rust (including cargo)
# # ENV RUSTUP_HOME=/usr/local/rustup \
# #     CARGO_HOME=/usr/local/cargo \
# #     PATH=/usr/local/cargo/bin:$PATH
# # RUN curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal

# # # Install cargo-make
# # RUN cargo install cargo-make --locked

# # # Install Node.js and npm (using NodeSource)
# # # Match the version used in the builder stage (v18.x)
# # RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
# #     apt-get update && apt-get install -y nodejs && \
# #     apt-get clean && rm -rf /var/lib/apt/lists/*

# # # Set working directory in final image
# # WORKDIR /app

# # # Copy the entire built application source (needed for cargo make run)
# # COPY --from=builder /app /app

# # EXPOSE 4444

# # # Removed script copy/permission steps

# # # Entrypoint: Embed the startup logic directly using shell form
# # # This avoids issues with script file formats (exec format error)
# # ENTRYPOINT ["/bin/sh", "-c", "dockerd > /var/log/dockerd.log 2>&1 & sleep 3 && docker pull ghcr.io/hyperledger-solang/solang:latest && cargo make run"]

