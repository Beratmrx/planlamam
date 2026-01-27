-- MySQL 8+ şeması (TABLOLAR HALİNDE)
-- Bu projede frontend tek payload gönderiyor (/api/storage),
-- backend bu payload'ı MySQL tablolarına yazar/okur.

create database if not exists planla
  character set utf8mb4
  collate utf8mb4_turkish_ci;

use planla;

create table if not exists users (
  id varchar(191) primary key,
  data json not null,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table if not exists categories (
  id varchar(191) primary key,
  data json not null,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table if not exists tasks (
  id varchar(191) primary key,
  data json not null,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table if not exists rentals (
  id varchar(191) primary key,
  data json not null,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table if not exists assets (
  id varchar(191) primary key,
  data json not null,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table if not exists app_settings (
  `key` varchar(191) primary key,
  json json not null,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

