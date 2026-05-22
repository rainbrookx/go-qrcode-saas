-- ============================================================================
-- 数据库初始化脚本
-- 数据库名称: db_go_qrcode_saas
-- 表前缀:     tb_
-- 说明:       不设置物理外键，关联关系由应用层维护
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `db_go_qrcode_saas`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `db_go_qrcode_saas`;

-- ============================================================================
-- 1. 用户表
-- ============================================================================
CREATE TABLE `tb_users` (
  `id`            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '用户ID',
  `email`         VARCHAR(254)     NOT NULL                 COMMENT '邮箱，唯一',
  `password_hash` VARCHAR(255)     NOT NULL                 COMMENT 'bcrypt 密码哈希',
  `created_at`    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '注册时间',
  `updated_at`    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================================================
-- 2. 邮箱验证码表
-- ============================================================================
CREATE TABLE `tb_email_verify_codes` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '记录ID',
  `email`      VARCHAR(254)     NOT NULL                 COMMENT '目标邮箱',
  `code`       VARCHAR(6)       NOT NULL                 COMMENT '6位数字验证码',
  `purpose`    ENUM('login','reset_password') NOT NULL  COMMENT '用途: login=登录, reset_password=找回密码',
  `expires_at` DATETIME         NOT NULL                 COMMENT '过期时间',
  `used`       TINYINT(1)       NOT NULL DEFAULT 0       COMMENT '是否已使用: 0=未使用, 1=已使用',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '发送时间',
  PRIMARY KEY (`id`),
  KEY `idx_email_purpose` (`email`, `purpose`),
  KEY `idx_email_code` (`email`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮箱验证码表';

-- ============================================================================
-- 3. Refresh Token 表
-- ============================================================================
CREATE TABLE `tb_refresh_tokens` (
  `id`          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '记录ID',
  `user_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '所属用户ID',
  `token_id`    VARCHAR(64)      NOT NULL                 COMMENT 'Token 唯一标识（JWT jti）',
  `expires_at`  DATETIME         NOT NULL                 COMMENT '过期时间（签发时间 + 3天）',
  `invalidated` TINYINT(1)       NOT NULL DEFAULT 0       COMMENT '是否已失效: 0=有效, 1=已失效（续签/登出后标记）',
  `created_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '签发时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_id` (`token_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Refresh Token 表';

-- ============================================================================
-- 4. 网址跳转码表
-- ============================================================================
CREATE TABLE `tb_urldyn_codes` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '记录ID',
  `user_id`    BIGINT UNSIGNED  NOT NULL                 COMMENT '所属用户ID',
  `code`       VARCHAR(8)       NOT NULL                 COMMENT '8位 Base62 短码',
  `target_url` VARCHAR(2048)    NOT NULL                 COMMENT '跳转目标 URL',
  `expires_at` DATETIME         NOT NULL                 COMMENT '过期时间',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '最后修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网址跳转码表';

-- ============================================================================
-- 5. 文章表
-- ============================================================================
CREATE TABLE `tb_articles` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '记录ID',
  `user_id`    BIGINT UNSIGNED  NOT NULL                 COMMENT '所属用户ID',
  `code`       VARCHAR(8)       NOT NULL                 COMMENT '8位 Base62 短码',
  `title`      VARCHAR(200)     NOT NULL                 COMMENT '文章标题',
  `content`    MEDIUMTEXT       NOT NULL                 COMMENT 'TipTap 输出的 HTML，上限 50000 字',
  `expires_at` DATETIME         NOT NULL                 COMMENT '过期时间',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '最后修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文章表';

-- ============================================================================
-- 6. 文章附件表
-- ============================================================================
CREATE TABLE `tb_article_attachments` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '记录ID',
  `article_id` BIGINT UNSIGNED  NOT NULL                 COMMENT '所属文章ID',
  `file_key`   VARCHAR(512)     NOT NULL                 COMMENT 'MinIO 对象键',
  `file_type`  ENUM('image','video','audio','file') NOT NULL  COMMENT '附件类型',
  `file_name`  VARCHAR(255)     NOT NULL                 COMMENT '原始文件名',
  `file_size`  BIGINT UNSIGNED  NOT NULL                 COMMENT '文件大小（字节）',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '上传时间',
  PRIMARY KEY (`id`),
  KEY `idx_article_id` (`article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文章附件表';

-- ============================================================================
-- 7. 表单表
-- ============================================================================
CREATE TABLE `tb_forms` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '记录ID',
  `user_id`         BIGINT UNSIGNED  NOT NULL                 COMMENT '所属用户ID',
  `code`            VARCHAR(8)       NOT NULL                 COMMENT '8位 Base62 短码',
  `title`           VARCHAR(200)     NOT NULL                 COMMENT '表单标题',
  `fields`          JSON             NOT NULL                 COMMENT '表单字段配置（x-render schema）',
  `max_submissions` INT UNSIGNED     DEFAULT NULL             COMMENT '提交数量上限，NULL=无限制',
  `deadline`        DATETIME         DEFAULT NULL             COMMENT '截止时间，NULL=不限制',
  `expires_at`      DATETIME         NOT NULL                 COMMENT '过期时间',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '最后修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='表单表';

-- ============================================================================
-- 8. 表单提交记录表
-- ============================================================================
CREATE TABLE `tb_form_submissions` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '记录ID',
  `form_id`    BIGINT UNSIGNED  NOT NULL                 COMMENT '所属表单ID',
  `values`     JSON             NOT NULL                 COMMENT '提交内容，键为字段id，值为提交值',
  `ip_address` VARCHAR(45)      NOT NULL                 COMMENT '提交者 IP（IPv4/IPv6）',
  `submitted_at` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '提交时间',
  PRIMARY KEY (`id`),
  KEY `idx_form_id` (`form_id`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_form_submitted` (`form_id`, `submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='表单提交记录表';

-- ============================================================================
-- 9. 访问统计表
-- ============================================================================
CREATE TABLE `tb_access_stats` (
  `id`           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '记录ID',
  `code_type`    ENUM('urldyn','article','form') NOT NULL  COMMENT '活码类型',
  `code_id`      BIGINT UNSIGNED  NOT NULL                 COMMENT '对应类型表中的记录ID',
  `access_date`  DATE             NOT NULL                 COMMENT '访问日期',
  `access_count` INT UNSIGNED     NOT NULL DEFAULT 0       COMMENT '当日访问次数',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_id_date` (`code_type`, `code_id`, `access_date`),
  KEY `idx_code_type_id` (`code_type`, `code_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日访问统计表';