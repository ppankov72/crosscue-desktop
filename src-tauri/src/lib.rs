mod license;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Emitter;

#[tauri::command]
fn get_license_status() -> Result<license::LicenseState, String> {
    let path = license::get_license_path();
    if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let state: license::LicenseState = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(state)
    } else {
        let hw_id = "temp-hardware-id".to_string();
        let state = license::LicenseState::new(hw_id);
        save_license_state(&state)?;
        Ok(state)
    }
}

#[tauri::command]
fn activate_license(key: String) -> Result<bool, String> {
    let normalized = key.trim().to_uppercase().replace(" ", "").replace("-", "");
    
    // Accept format: CROSSCUEPROXXXXXXXX (16+ chars after removing dashes)
    if !normalized.starts_with("CROSSCUEPRO") || normalized.len() < 16 {
        return Err("Invalid license format. Expected: CROSSCUE-PRO-XXXX-XXXX".into());
    }

    let mut state = get_license_status()?;
    state.license_key = Some(key.trim().to_uppercase());
    state.is_activated = true;
    save_license_state(&state)?;
    Ok(true)
}

fn save_license_state(state: &license::LicenseState) -> Result<(), String> {
    let path = license::get_license_path();
    let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_license_status,
            activate_license
        ])
        .setup(|app| {
            let view_menu = Submenu::with_items(app, "View", true, &[
                &MenuItem::with_id(app, "toggle_deck_a", "Toggle Deck A", true, None::<&str>)?,
                &MenuItem::with_id(app, "toggle_mixer", "Toggle Mixer", true, None::<&str>)?,
                &MenuItem::with_id(app, "toggle_deck_b", "Toggle Deck B", true, None::<&str>)?,
                &MenuItem::with_id(app, "toggle_library", "Toggle Library", true, None::<&str>)?,
            ])?;

            let tools_menu = Submenu::with_items(app, "Tools", true, &[
                &MenuItem::with_id(app, "open_settings", "Settings", true, None::<&str>)?,
                &MenuItem::with_id(app, "open_midi", "MIDI Connect", true, None::<&str>)?,
                &MenuItem::with_id(app, "open_recording", "Recording", true, None::<&str>)?,
                &MenuItem::with_id(app, "open_karaoke", "Karaoke", true, None::<&str>)?,
            ])?;

            let menu = Menu::with_items(app, &[
                &PredefinedMenuItem::about(app, Some("CROSSCUE"), None)?,
                &view_menu,
                &tools_menu,
                &PredefinedMenuItem::quit(app, Some("Quit CROSSCUE"))?,
            ])?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app, event| {
                let id = event.id().0.as_str();
                let _ = app.emit("menu-event", id);
            });

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}