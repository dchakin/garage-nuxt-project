DROP INDEX `categories_name_unique`;--> statement-breakpoint
ALTER TABLE `categories` ADD `car_id` integer REFERENCES cars(id) ON DELETE cascade;--> statement-breakpoint
-- Перенос своих категорий (is_default = 0) в категории машин — вручную, drizzle-kit этого не генерирует.
-- Какие машины пользуются каждой своей категорией (записи и напоминания).
CREATE TEMP TABLE `_category_usage` AS
  SELECT DISTINCT `category_id`, `car_id` FROM (
    SELECT `category_id`, `car_id` FROM `entries` WHERE `category_id` IS NOT NULL
    UNION
    SELECT `category_id`, `car_id` FROM `reminders` WHERE `category_id` IS NOT NULL
  )
  WHERE `category_id` IN (SELECT `id` FROM `categories` WHERE `is_default` = 0);--> statement-breakpoint
-- Не используется ни одной машиной — удалить.
DELETE FROM `categories`
  WHERE `is_default` = 0 AND `id` NOT IN (SELECT `category_id` FROM `_category_usage`);--> statement-breakpoint
-- Исходная категория остаётся у машины с наименьшим id.
UPDATE `categories`
  SET `car_id` = (SELECT MIN(`car_id`) FROM `_category_usage` WHERE `category_id` = `categories`.`id`)
  WHERE `is_default` = 0;--> statement-breakpoint
-- Остальным машинам — по копии (имя было глобально уникальным, поэтому (car_id, name) однозначно).
INSERT INTO `categories` (`name`, `is_default`, `car_id`)
  SELECT `c`.`name`, 0, `u`.`car_id`
  FROM `_category_usage` `u` JOIN `categories` `c` ON `c`.`id` = `u`.`category_id`
  WHERE `u`.`car_id` <> `c`.`car_id`;--> statement-breakpoint
UPDATE `entries`
  SET `category_id` = (
    SELECT `copy`.`id` FROM `categories` `orig`
    JOIN `categories` `copy` ON `copy`.`name` = `orig`.`name` AND `copy`.`car_id` = `entries`.`car_id`
    WHERE `orig`.`id` = `entries`.`category_id`
  )
  WHERE `category_id` IN (
    SELECT `id` FROM `categories` WHERE `is_default` = 0 AND `car_id` <> `entries`.`car_id`
  );--> statement-breakpoint
UPDATE `reminders`
  SET `category_id` = (
    SELECT `copy`.`id` FROM `categories` `orig`
    JOIN `categories` `copy` ON `copy`.`name` = `orig`.`name` AND `copy`.`car_id` = `reminders`.`car_id`
    WHERE `orig`.`id` = `reminders`.`category_id`
  )
  WHERE `category_id` IN (
    SELECT `id` FROM `categories` WHERE `is_default` = 0 AND `car_id` <> `reminders`.`car_id`
  );--> statement-breakpoint
DROP TABLE `_category_usage`;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_car_name_unique` ON `categories` (`car_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_default_name_unique` ON `categories` (`name`) WHERE "categories"."car_id" is null;
