CREATE DATABASE auth_db;

-- 1. AUTH DATABASE
\c auth_db;

CREATE TABLE roles (
    roleid SERIAL PRIMARY KEY,
    rolename VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    uid SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    roleid INT NOT NULL REFERENCES roles(roleid)
);

INSERT INTO roles (roleid, rolename) VALUES 
(1, 'Admin'), 
(2, 'Customer'), 
(3, 'ShipmentStaff');

-- Passwords are 'P@ss123'
INSERT INTO users (uid, username, password, email, phone, roleid) VALUES 
(1, 'john', '$2b$10$meucrQCFtEBmi718DwCeWe.MCEO1iJIpYk2NhvKLvd4eMaE9XV7G6', 'john@example.com', '0900000000', 2),
(2, 'admin', '$2b$10$meucrQCFtEBmi718DwCeWe.MCEO1iJIpYk2NhvKLvd4eMaE9XV7G6', 'admin@example.com', '0911111111', 1),
(3, 'shipper', '$2b$10$meucrQCFtEBmi718DwCeWe.MCEO1iJIpYk2NhvKLvd4eMaE9XV7G6', 'shipper@example.com', '0922222222', 3);

SELECT setval('users_uid_seq', (SELECT MAX(uid) FROM users));
