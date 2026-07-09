use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const KEYRING_SERVICE: &str = "com.rambam.app";
const KEYRING_USER: &str = "api_key";
const DEFAULT_API_URL: &str = "https://api.drsammy.mntm.dev";
const STORE_PATH: &str = "settings.json";

type AppStore = std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>>;

fn get_store(app: &AppHandle) -> Result<AppStore, String> {
    app.store(STORE_PATH).map_err(|e| e.to_string())
}

fn get_key_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

fn load_url(store: &AppStore) -> String {
    store
        .get("apiUrl")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_API_URL.to_string())
}

#[derive(serde::Serialize)]
struct Settings {
    url: String,
    has_key: bool,
}

#[tauri::command]
async fn save_settings(app: AppHandle, url: String, key: String) -> Result<(), String> {
    let store = get_store(&app)?;
    store.set("apiUrl", url);
    store.save().map_err(|e| e.to_string())?;

    let entry = get_key_entry()?;
    if !key.is_empty() {
        entry.set_password(&key).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn load_settings(app: AppHandle) -> Result<Settings, String> {
    let store = get_store(&app)?;
    let entry = get_key_entry()?;
    let has_key = entry.get_password().is_ok();

    Ok(Settings {
        url: load_url(&store),
        has_key,
    })
}

#[tauri::command]
async fn reset_settings(app: AppHandle) -> Result<(), String> {
    let store = get_store(&app)?;
    store.set("apiUrl", DEFAULT_API_URL);
    store.save().map_err(|e| e.to_string())?;

    let entry = get_key_entry()?;
    let _ = entry.delete_credential();

    Ok(())
}

#[tauri::command]
async fn fetch_url(app: AppHandle, path: String) -> Result<String, String> {
    let store = get_store(&app)?;
    let base_url = load_url(&store);
    let url = format!("{}{}", base_url.trim_end_matches('/'), path);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let mut request = client.get(&url);

    let entry = get_key_entry()?;
    if let Ok(key) = entry.get_password() {
        if !key.is_empty() {
            request = request.header("X-Open-Wearables-API-Key", key);
        }
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    let status = response.status();
    let body = response.text().await.map_err(|e| e.to_string())?;

    println!("[rambam] {} -> HTTP {}", url, status);

    if status.is_success() {
        Ok(body)
    } else {
        Err(format!("HTTP {}: {}", status, body))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![fetch_url, save_settings, load_settings, reset_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
