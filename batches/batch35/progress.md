# Партия 35 — итог (2026-11-23)

- Старт: 2422 компании. Финал (getoverview): **2494 компании** (+72 новых). Отзывов по-прежнему 0.
- Кандидатов: 146 (10 групп). Дублей по предпроверке: 67. К добавлению: 79.
- Обработано все 79: добавлено 72, ещё 7 дублей поймала страховка addcompany (вернул старый id, проверено через getcompany).

## Добавлено по категориям (сверено с getoverview)
- beauty +16 (345): Косметологія FineLine, Клініка Естетики та Хірургії Обличчя, Klinika Profesora Khmilya, Ветеринарна клініка Пан Коцький, FitLife Gym, Medilabs, Стоматологія Dent Life, Rivnenska Oblasna Stomatolohichna Poliklinika, MD-Dental, Celebriti, Denali, Велес Вет, In Vet, КотоПес, Fitland, Центр пластичної хірургії
- it +13 (235): Aymobile, iGarden, Web-Raketa, СумыТехСервис, IT-Сервис, M Service, Exe-Com, Хостеринг, 3D Vision, WebStudiy, LCD-GSM, AlphaDigital, LightSEO
- travel +11 (265): Mr.Travel, Країна Ю Ей, Веселі Кукурудзки, ОГО Тур, Готель Станіславів, Алея Гранд, Emigrand Art Hotel, Готель Камелот, TP.UA, Laska Wedding, Mariana Wedding
- finance +8 (282): Экспресс-Аудит, Вектор Аудиту, Аудит Эксперт, Куцак & Партнеры, Адвокатское бюро Елены Романюк и Партнёры, Глазков и Партнёры, Lex Legal, CLY
- shops +7 (324): ОЛА (Cleaning OLA), Спритна Мартуся, Буде Чисто, Архітектура меблів, Clean and Co, Clean Team, Попелюшка
- delivery +7 (177), food +2 (125): Суши Буш (2424), Story Pizza (2429), Pepper Point (2426), QR Pizza (2427), Sushi Box (2428), Royal Palace (2425), Хліб-сіль (2423), SushiNova Винница (2430), Sensey Sushi (2431)
- auto +4 (242): Прокат Авто Блиц, Автошкола Антарес Смела, DrivePro, Автосервіс Час Пік
- education +3 (250): NovaSchool, StartDeutsch, Slava Studio
- realestate +1 (249): Інвестор

## Дубли, пойманные страховкой addcompany (не добавлены повторно)
- Dentis Line → id 2040 (та же клиника, Днепр, сайт dentis-line.dp.ua)
- Brosko Studio → id 2364 (та же студия, Полтава, сайт brosko-studio.com.ua)
- Kachanini → id 1263 (тот же сайт и телефон)
- Cleaning Services → id 1959 (Черкассы, тот же сайт и телефон)
- Grand Royal → id 2304 (Черновцы, тот же сайт и телефон)
- Americana Language School → id 2154 (Черновцы, тот же сайт и телефон)
- YaK Language School → id 2153 (Черновцы, тот же сайт и телефон)

Урок: поиск по широким запросам (например, «Dental») возвращает не более 100 компаний, поэтому часть дублей видна только через страховку addcompany — её проверка обязательна для каждого добавления.

## Прогресс к цели
2494 / 5000 = 49,9%.
