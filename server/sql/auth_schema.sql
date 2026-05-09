CREATE DATABASE IF NOT EXISTS ar_maintenance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ar_maintenance;

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
);

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_id (role_id),
  CONSTRAINT fk_users_role_id
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  KEY idx_auth_sessions_user_id (user_id),
  KEY idx_auth_sessions_expires_at (expires_at),
  CONSTRAINT fk_auth_sessions_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fault_severities (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  level TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fault_severities_name (name),
  UNIQUE KEY uq_fault_severities_level (level)
);

CREATE TABLE IF NOT EXISTS fault_status (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fault_status_name (name)
);

CREATE TABLE IF NOT EXISTS fault_assets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fault_assets_name (name)
);

CREATE TABLE IF NOT EXISTS fault_component (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fault_component_name (name)
);

CREATE TABLE IF NOT EXISTS fault_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  component_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  severity_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fault_types_component_name (component_id, name),
  UNIQUE KEY uq_fault_types_id_component (id, component_id),
  KEY idx_fault_types_severity_id (severity_id),
  CONSTRAINT fk_fault_types_component_id
    FOREIGN KEY (component_id) REFERENCES fault_component(id),
  CONSTRAINT fk_fault_types_severity_id
    FOREIGN KEY (severity_id) REFERENCES fault_severities(id)
);

CREATE TABLE IF NOT EXISTS faults (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fault_type_id INT UNSIGNED NOT NULL,
  asset_id INT UNSIGNED NOT NULL,
  severity_id INT UNSIGNED NOT NULL,
  status_id INT UNSIGNED NOT NULL,
  asset_fault_qr_code VARCHAR(80) NULL,
  notes VARCHAR(500) NULL,
  created_by_user_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_faults_asset_fault_qr_code (asset_fault_qr_code),
  KEY idx_faults_fault_type_id (fault_type_id),
  KEY idx_faults_asset_id (asset_id),
  KEY idx_faults_severity_id (severity_id),
  KEY idx_faults_status_id (status_id),
  KEY idx_faults_created_by_user_id (created_by_user_id),
  CONSTRAINT fk_faults_fault_type_id
    FOREIGN KEY (fault_type_id) REFERENCES fault_types(id),
  CONSTRAINT fk_faults_asset_id
    FOREIGN KEY (asset_id) REFERENCES fault_assets(id),
  CONSTRAINT fk_faults_severity_id
    FOREIGN KEY (severity_id) REFERENCES fault_severities(id),
  CONSTRAINT fk_faults_status_id
    FOREIGN KEY (status_id) REFERENCES fault_status(id),
  CONSTRAINT fk_faults_created_by_user_id
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fault_instructions (
  fault_type_id INT UNSIGNED NOT NULL,
  component_id INT UNSIGNED NOT NULL,
  step_order INT UNSIGNED NOT NULL,
  instruction_step VARCHAR(500) NOT NULL,
  PRIMARY KEY (fault_type_id, component_id, step_order),
  KEY idx_fault_instructions_component_id (component_id),
  CONSTRAINT fk_fault_instructions_fault_type_component
    FOREIGN KEY (fault_type_id, component_id)
    REFERENCES fault_types(id, component_id),
  CONSTRAINT fk_fault_instructions_component_id
    FOREIGN KEY (component_id) REFERENCES fault_component(id)
);

CREATE TABLE IF NOT EXISTS tools (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  qr_code VARCHAR(80) NULL,
  last_checked_out_by_user_id INT UNSIGNED NULL,
  last_action ENUM('checked_in', 'checked_out') NOT NULL DEFAULT 'checked_in',
  last_checked_out_at DATETIME NULL,
  last_checked_in_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tools_name (name),
  UNIQUE KEY uq_tools_qr_code (qr_code),
  KEY idx_tools_last_checked_out_by_user_id (last_checked_out_by_user_id),
  CONSTRAINT fk_tools_last_checked_out_by_user_id
    FOREIGN KEY (last_checked_out_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tool_check_out (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tool_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  action ENUM('checked_out', 'checked_in') NOT NULL,
  action_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_tool_check_out_tool_id (tool_id),
  KEY idx_tool_check_out_user_id (user_id),
  KEY idx_tool_check_out_action_at (action_at),
  CONSTRAINT fk_tool_check_out_tool_id
    FOREIGN KEY (tool_id) REFERENCES tools(id),
  CONSTRAINT fk_tool_check_out_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO roles (name)
VALUES
  ('admin'),
  ('engineer')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO users (email, password_hash, role_id)
VALUES
  (
    'admin.tech@example.com',
    '$2b$12$3GPF.l/2v8J9ToADQoQVku54R1Br77QrnrBFqP.Aq1aAhnUMq8/.e',
    (SELECT id FROM roles WHERE name = 'admin')
  ),
  (
    'field.engineer@example.com',
    '$2b$12$aOCnhT9eMOBZWcUGyaBcGuchAnGVWGEIbgDMfEKNld25bYGM.G1ga',
    (SELECT id FROM roles WHERE name = 'engineer')
  )
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role_id = VALUES(role_id),
  is_active = 1;

INSERT INTO fault_severities (name, level)
VALUES
  ('Low', 1),
  ('Moderate', 2),
  ('High', 3),
  ('Critical', 4),
  ('Emergency', 5)
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO fault_status (name)
VALUES
  ('reported'),
  ('working on'),
  ('fixed')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO fault_assets (name)
VALUES
  ('Passenger Train Unit 204'),
  ('Freight Locomotive L-88'),
  ('Water Main Sector 7')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO fault_component (name, description)
VALUES
  ('Brake Assembly', 'Includes brake pads, calipers, and hydraulic linkages'),
  ('Traction Engine', 'Primary propulsion engine and related cooling systems'),
  ('Pipe Joint', 'Pressurized joint section in underground water network')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

INSERT INTO fault_types (component_id, name, description, severity_id)
VALUES
  (
    (SELECT id FROM fault_component WHERE name = 'Brake Assembly'),
    'Brake Pressure Loss',
    'Brake line pressure drops below safe operating threshold',
    (SELECT id FROM fault_severities WHERE level = 4)
  ),
  (
    (SELECT id FROM fault_component WHERE name = 'Traction Engine'),
    'Engine Coolant Leak',
    'Coolant leak detected causing overheating risk',
    (SELECT id FROM fault_severities WHERE level = 5)
  ),
  (
    (SELECT id FROM fault_component WHERE name = 'Pipe Joint'),
    'Burst Pipe',
    'Pipe joint rupture causing active water release',
    (SELECT id FROM fault_severities WHERE level = 4)
  )
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  severity_id = VALUES(severity_id);

-- MIND AR / QR PLAN (minimal set):
-- 1 QR per tool:
--   TOOL-HAMMER-001
--   TOOL-WRENCH-001
--   TOOL-PLIERS-001
-- 1 QR per asset-fault combination currently seeded:
--   AF-PAX204-BRAKEPRESSURELOSS-001
--   AF-WMAIN7-BURSTPIPE-001

INSERT INTO faults (fault_type_id, asset_id, severity_id, status_id, asset_fault_qr_code, notes, created_by_user_id)
VALUES
  (
    (
      SELECT ft.id
      FROM fault_types ft
      JOIN fault_component fc ON fc.id = ft.component_id
      WHERE ft.name = 'Brake Pressure Loss' AND fc.name = 'Brake Assembly'
    ),
    (SELECT id FROM fault_assets WHERE name = 'Passenger Train Unit 204'),
    (SELECT id FROM fault_severities WHERE level = 4),
    (SELECT id FROM fault_status WHERE name = 'reported'),
    'AF-PAX204-BRAKEPRESSURELOSS-001',
    'Driver reports reduced braking response at Station B approach.',
    (SELECT id FROM users WHERE email = 'field.engineer@example.com')
  ),
  (
    (
      SELECT ft.id
      FROM fault_types ft
      JOIN fault_component fc ON fc.id = ft.component_id
      WHERE ft.name = 'Burst Pipe' AND fc.name = 'Pipe Joint'
    ),
    (SELECT id FROM fault_assets WHERE name = 'Water Main Sector 7'),
    (SELECT id FROM fault_severities WHERE level = 4),
    (SELECT id FROM fault_status WHERE name = 'working on'),
    'AF-WMAIN7-BURSTPIPE-001',
    'Active leak flooding pavement near maintenance hatch 7C.',
    (SELECT id FROM users WHERE email = 'field.engineer@example.com')
  )
ON DUPLICATE KEY UPDATE
  asset_fault_qr_code = VALUES(asset_fault_qr_code),
  notes = VALUES(notes),
  status_id = VALUES(status_id),
  severity_id = VALUES(severity_id),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO fault_instructions (fault_type_id, component_id, step_order, instruction_step)
VALUES
  (
    (
      SELECT ft.id
      FROM fault_types ft
      JOIN fault_component fc ON fc.id = ft.component_id
      WHERE ft.name = 'Brake Pressure Loss' AND fc.name = 'Brake Assembly'
    ),
    (SELECT id FROM fault_component WHERE name = 'Brake Assembly'),
    1,
    'Secure train and apply wheel chocks before brake line inspection.'
  ),
  (
    (
      SELECT ft.id
      FROM fault_types ft
      JOIN fault_component fc ON fc.id = ft.component_id
      WHERE ft.name = 'Brake Pressure Loss' AND fc.name = 'Brake Assembly'
    ),
    (SELECT id FROM fault_component WHERE name = 'Brake Assembly'),
    2,
    'Inspect brake hoses and fittings for leaks, cracks, or loose couplings.'
  ),
  (
    (
      SELECT ft.id
      FROM fault_types ft
      JOIN fault_component fc ON fc.id = ft.component_id
      WHERE ft.name = 'Brake Pressure Loss' AND fc.name = 'Brake Assembly'
    ),
    (SELECT id FROM fault_component WHERE name = 'Brake Assembly'),
    3,
    'Replace damaged line section, repressurize system, and perform brake test run.'
  )
ON DUPLICATE KEY UPDATE
  instruction_step = VALUES(instruction_step);

INSERT INTO tools (name, qr_code, last_checked_out_by_user_id, last_action, last_checked_out_at, last_checked_in_at)
VALUES
  (
    'Hammer',
    'TOOL-HAMMER-001',
    (SELECT id FROM users WHERE email = 'field.engineer@example.com'),
    'checked_out',
    CURRENT_TIMESTAMP,
    NULL
  ),
  (
    'Adjustable Wrench',
    'TOOL-WRENCH-001',
    (SELECT id FROM users WHERE email = 'admin.tech@example.com'),
    'checked_in',
    DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY),
    CURRENT_TIMESTAMP
  ),
  (
    'Pliers',
    'TOOL-PLIERS-001',
    (SELECT id FROM users WHERE email = 'field.engineer@example.com'),
    'checked_in',
    DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 4 HOUR),
    CURRENT_TIMESTAMP
  )
ON DUPLICATE KEY UPDATE
  qr_code = VALUES(qr_code),
  last_checked_out_by_user_id = VALUES(last_checked_out_by_user_id),
  last_action = VALUES(last_action),
  last_checked_out_at = VALUES(last_checked_out_at),
  last_checked_in_at = VALUES(last_checked_in_at);

INSERT INTO tool_check_out (tool_id, user_id, action, action_at, notes)
VALUES
  (
    (SELECT id FROM tools WHERE name = 'Hammer'),
    (SELECT id FROM users WHERE email = 'field.engineer@example.com'),
    'checked_out',
    DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 HOUR),
    'Issued for brake assembly access work.'
  ),
  (
    (SELECT id FROM tools WHERE name = 'Adjustable Wrench'),
    (SELECT id FROM users WHERE email = 'admin.tech@example.com'),
    'checked_in',
    DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 HOUR),
    'Returned after pipe joint isolation.'
  )
ON DUPLICATE KEY UPDATE
  notes = VALUES(notes),
  action_at = VALUES(action_at);
