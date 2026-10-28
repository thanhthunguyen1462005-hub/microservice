CREATE DATABASE auth_db;
CREATE DATABASE customer_db;
CREATE DATABASE order_db;

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

-- 2. CUSTOMER DATABASE
\c customer_db;

CREATE TABLE memberships (
    mid SERIAL PRIMARY KEY,
    mname VARCHAR(50) NOT NULL,
    score INT NOT NULL DEFAULT 0
);

CREATE TABLE customers (
    uid INT PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    mid INT NOT NULL REFERENCES memberships(mid)
);

INSERT INTO memberships (mid, mname, score) VALUES 
(1, 'Standard', 10),
(2, 'Silver', 100),
(3, 'Gold', 500),
(4, 'Platinum', 1000);

INSERT INTO customers (uid, fullname, mid) VALUES 
(1, 'John Doe', 1);

-- 3. ORDER DATABASE
\c order_db;

CREATE TABLE orders (
    oid SERIAL PRIMARY KEY,
    uid INT NOT NULL,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_details (
    oid INT NOT NULL REFERENCES orders(oid) ON DELETE CASCADE,
    pid INT NOT NULL,
    qty INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (oid, pid)
);

CREATE TABLE outbox_events (
    id SERIAL PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER SEQUENCE orders_oid_seq RESTART WITH 1001;
