use std::path::Path;

use clap::Parser;

use actix_files as fs;

use actix_web::{
    App, HttpResponse, HttpServer, Result,
    middleware::{self, DefaultHeaders},
    web,
    web::post,
};

use backend::{Opts, route_compile};

// Import Cors
use actix_cors::Cors;

pub struct FrontendState {
    pub frontend_folder: String,
}

pub fn route_frontend(at: &str, dir: &str) -> actix_files::Files {
    fs::Files::new(at, dir).index_file("index.html")
}

pub async fn route_frontend_version(data: web::Data<FrontendState>) -> Result<actix_files::NamedFile> {
    Ok(fs::NamedFile::open(
        Path::new(&data.frontend_folder).join("index.html"),
    )?)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let opts: Opts = Opts::parse();

    let port = opts.port;
    let host = opts.host.clone();

    if let Some(path) = &opts.frontend_folder {
        if !Path::new(path).is_dir() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Frontend folder not found: {}", path),
            ));
        }
    }

    async fn health() -> HttpResponse {
        HttpResponse::Ok().finish()
    }

    HttpServer::new(move || {
        let opts: Opts = opts.clone();
        let frontend_folder = opts.frontend_folder.clone();
        // Define CORS configuration
        // IMPORTANT: Adjust allowed_origin for production!
        let cors = Cors::default()
            .allow_any_header()
            .allow_any_method()
            .allow_any_origin()
            .max_age(3600);
        // .allowed_origin("http://localhost:3000") // Allow frontend dev server
        // .allowed_origin("http://3.87.56.152:3000") // Allow your deployed backend (if frontend served from same origin)
        // // Add your Vercel URL(s) here:
        // .allowed_origin("https://your-project-name.vercel.app") // Replace with your actual Vercel URL
        // // You might need allowed_origin_fn for dynamic origins or multiple Vercel previews
        // .allowed_methods(vec!["GET", "POST"])
        // .allowed_headers(vec![actix_web::http::header::AUTHORIZATION, actix_web::http::header::ACCEPT, actix_web::http::header::CONTENT_TYPE])
        // .max_age(3600);

        let mut app = App::new()
            .wrap(cors)
            .service(web::resource("/health").to(health))
            // Enable GZIP compression
            .wrap(middleware::Compress::default())
            .wrap(
                DefaultHeaders::new()
                    .add(("Cross-Origin-Opener-Policy", "same-origin"))
                    .add(("Cross-Origin-Embedder-Policy", "require-corp")),
            )
            .route("/compile", post().to(|body| route_compile(body)));

        // Serve frontend files if configured via CLI
        match frontend_folder {
            Some(path) => {
                app = app
                    .app_data(web::Data::new(FrontendState {
                        frontend_folder: path.clone(),
                    }))
                    .route("/v{tail:.*}", web::get().to(route_frontend_version))
                    .service(route_frontend("/", path.as_ref()));
            },
            None => {
                println!(
                    "Warning: Starting backend without serving static frontend files due to missing configuration."
                )
            },
        }

        app
    })
    .bind(format!("{}:{}", &host, &port))?
    .run()
    .await?;

    Ok(())
}
