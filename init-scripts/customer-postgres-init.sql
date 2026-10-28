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