# Партия 33 — отчёт (2026-11-23)

## Итог
- Старт: 2242 компании (проверено getoverview).
- Добавлено: **117 новых компаний**, id 2243–2359 (все возвращённые id > 2242, т.е. genuinely новые).
- Финал: **2359 компаний** — проверено getoverview 2026-11-23 ~02:09.
- Отзывов по-прежнему 0.

## По категориям (итого в каталоге)
- shops 309 (+13), finance 268 (+13), delivery 167 (+12), food 121 (+1), beauty 321 (+12), auto 230 (+13), realestate 244 (+8), education 241 (+15), it 212 (+12), travel 246 (+18).

## Добавлено по нишам
- **Юристы/консалтинг (13):** Сімейний адвокат, Аудит Консалтинг Центр, Legal Key, Адвокатське об'єднання Джаст Лоєрс, Делькредере, Лекс Практика, Адвокатське бюро Василя Міхалюка, Адвокатська компанія Андрій Мягкий і Партнери, Юридично-експертна компанія Баранкова, Адвокатське бюро Микулик та Партнери, Адвокат Родіонова Вікторія Євгенівна, Capital Plus (аудит), Бізнес Позика (онлайн-кредиты).
- **Туризм/отели/свадьбы (18):** ZT-Travel, Komfort-Tur, Чернігів-тур, Чарівний світ подорожі, Квитки у Літо, Mr. Travel, Юнеко Тур, VK Tour, Tours & Tickets, Грінвіч-Тур, Сумитурист, Grand Royal, Mary Ann, Гарячі Тури, Simply Travel, 7 Days Hotel, Глобус Тур, DRUZI CLUB.
- **Авто (13):** СТО Autoteam, Автосервис PRO.СТО, Avtomotiv Service, Автошкола Антарес Черкассы, Корпорация Автошкол, Автошкола Черкаської ОСВ, Ktrans Rental, Pilot Avto, Автошкола РОО ВСА, Автосервис Импульс Лоял, WM AVTO, CarPlates, Vin-Car.
- **Образование/курсы (15):** Be Smart, Edling, IQlab, Best CV, Alternativa, GlobalStaff, Kids Stfalcon Academy, itBaza, SARGOI, English Teacher Oleg, CLA English, ESL, Big Ben, Школа масажу Master, Slay School.
- **Красота/здоровье (12):** Стоматология BeSmile, WHITE CLINIC, PlastArt, Медестет, Вет-Експерт Одесса, Тіна, uPet, ЕкоЦентр, FIT 360, Фотостудія Emotion, Яворська Studio, Gorizont.
- **Недвижимость/строительство/мебель/дизайн (8+):** Plus Development, ТерБудКомплект, Ромтіс Буд, Pasteli Interiors, Sttk Development, Ваш Квадрат, Forest-Ukraine, Ай-Меблі, SK SHINE, Свіжість, Меблі Мелвін, MebWood, Рімейк, Clarry Clean, ЧИСТОКАЙФ, Профсервіс Буковини, ANARO, Sumy Clining Group, Меблі Плюс, Меблі DecArt.
- **IT (12):** SiteTechnology, WildWeb Studio, UH Design, Web Love ME, TheHost, КомпоДоктор, WebEra, Веб-студия 009, Tech Remont, Synebo, SumWeb Studio, SEO.KR.UA.
- **Доставка еды (12):** Nori, ДобраPizza, KAIFUI, Black Pizza, Just Sushi, Toto Sushi, Мацурі, KILOGRAMM, Sushinova, Festa Pizza, Cook Drive, SunRise Sushi.
- **Food (1):** Florens (траттория, Ивано-Франковск).

## Выборочная перепроверка (getcompany)
- id 2293 VK Tour — корректно: travel, Черновцы, телефон, сайт.
- id 2333 Web Love ME — корректно: it, Днепр, телефон, email.
- id 2359 Toto Sushi — корректно: delivery, Хмельницкий, телефон, сайт.

## Пропущено — 33 кандидата (дубли, с id в каталоге)
Тиса Меблі 1680, УжДент 1877, DeSushi 1838, G CAR Service 1585, Галицька Правнича Група 1690, BROSKO 1562, Harmony 1962, Dental Clinic ELITES 1769, Nazarov Dental Clinic 1865, Beautycom 1467, Dermalife 1468, Total Fitness Велес 2049, БУДЛАЙФ 1652, Будівельна компанія Надія 1641, Ecobud 1887, Arte Development 1550, КОЛЕО 1878, Kadium 1676, РемСуми 1677, KIMS 1524, Гермес (тот же домен germesmebli.com.ua, что и Гермес Винница 1548), Універ Капітал 1404, MyCredit 1477, СТО G CAR Service (тот же домен, что и 1585), Бош Авто Сервіс Автопростір 1590, New IT School 1831, Освітній центр «Apple» 1826, Get Ready 1828, Cityhost 501, Pastory 1744, Pronto Pizza 472. Filandor и Globalistic — не в каталоге, но исключены как неподтверждённое существование (уже исключались в партиях 26, 28, 29 и 30 по той же причине; не добавлять без новых доказательств).

## Заметки процесса
- Все 150 кандидатов проверены координатором через searchcompanies без фильтра категории (RU + Latin, с дефисом/без, с пробелом/без, без города, второй проход по домену): 117 новых, 33 исключено.
- Один вызов addcompany (Toto Sushi) в последней семёрке сначала не прошёл из-за перезагрузки схемы инструмента после компактации контекста — повторён успешно, id 2359.
- Все компании — украинские, региональные/нишевые, приоритет — ниши с предоплатой (юристы, туризм, авто, строительство/мебель, курсы, IT).
