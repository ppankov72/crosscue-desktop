use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Utc, Duration};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LicenseState {
    pub first_run: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub hardware_id: String,
    pub license_key: Option<String>,
    pub is_activated: bool,
}

impl LicenseState {
    pub fn new(hardware_id: String) -> Self {
        let now = Utc::now();
        Self {
            first_run: now,
            last_seen: now,
            hardware_id,
            license_key: None,
            is_activated: false,
        }
    }

    pub fn trial_remaining_seconds(&self) -> i64 {
        let trial_end = self.first_run + Duration::days(3);
        let remaining = (trial_end - Utc::now()).num_seconds();
        remaining.max(0)
    }

    pub fn is_trial_valid(&self) -> bool {
        self.trial_remaining_seconds() > 0
    }
}

pub fn get_license_path() -> PathBuf {
    let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("com.crosscue.app");
    let _ = fs::create_dir_all(&path);
    path.push("license.json");
    path
}