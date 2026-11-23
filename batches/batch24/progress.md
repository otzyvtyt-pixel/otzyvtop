# Партия 24 — итог

**Добавлено 51 новая проверенная украинская компания. Каталог: 1459 → 1510, подтверждено финальным getoverview.**

Категории: shops 189→198 (+9), finance 174→177 (+3), delivery 90→98 (+8), food 86→88 (+2), beauty 209→215 (+6), auto 134→138 (+4), realestate 173→176 (+3), education 133 (0), it 114→125 (+11), travel 157→162 (+5). Отзывов по-прежнему 0.

Все 51 добавлены только мной через addcompany (id 1460–1510) после моей же проверки дублей через searchcompanies без фильтра категории, по русскому и латинскому написанию, без дефисов и кавычек. Подагенты (10 групп) готовили только payload-файлы, artifact.invoke_action и app.db не трогали. Всего проверено 139 кандидатов, пропущено 88. Выборочно перепроверены через getcompany (1460, 1472, 1476, 1485, 1491, 1499, 1504, 1510) — имена, категории и описания совпадают.

## Добавлено — 51, по нишам

**IT (11):** MiroHost, NIC.UA, GigaCloud, Tucha, Sigma Software, Ciklum, NetHunt CRM, OneBox OS, Poster POS, YouControl, DeNovo.
**Shops (9):** Галя Балувана, AppLab, Profimebel, Blanche, Фабрика Мебели Харьков, Fix Mebli, EvoDesign, White Wood, Dyus (ДЮС).
**Delivery (8):** Smaki-Maki, Monkey Sushi, Sushi King, Sushi Master, RakiShop, Timeeat, Fommi Foods, СушіБос (SushiBoss).
**Beauty (6):** ЕСТЕТ-МЕДІКАЛ, Top Clinic, Beautycom, Dermalife, Esthetic Dental Studio, Mega Dental.
**Travel (5):** Pollardi, OKSANA MUKHA, WONA Concept, BANKHOTEL, Optima Hotels & Resorts.
**Auto (4):** Автопідбір Київ, AUTOHELP, NevoCars, United Service.
**Realestate (3):** SB Group, Voloshyn Interior Design, PNVTEAM GROUP.
**Finance (3):** Банк Львів, MyCredit, CreditPlus.
**Food (2):** Mamenori, CoffeeOcean.

## Пропущено — дубли (87, уже в каталоге — с id)

- **Beauty (7):** Certus (1367), Клініка професора Храпача (1166), Platinum Laser (1355), IYA Clinic (1369), VipDental (1165), Maslov Clinic (1168), Spa Office (1172).
- **Realestate (11):** PRO-GROUP (1379), NovaBudova (1249), Интергал-Буд (319), Kovalska (1047), SAGA Development (354), ZEZMAN (1250), GREENWOOD (1257), blago developer (931), Франківський Дім (1258), Житлобуд-2 (1370), TERTY DESIGN (1240).
- **Shops (7):** Меблі GuKon (1191), Сова Меблі (1192), Timber Pro (1193), DOROGO (1185), Artbruno (1267), Woodville (1186), Меблі 7я (1272).
- **Finance (11):** ПУМБ (156), Sense Bank (153), ТАСКОМБАНК (1195), Кредобанк (260), Укрсиббанк (243), Moneyveo (1414), Asters (1065), Sayenko Kharenko (1197), Dragon Capital (1281), ICU (1278), Concorde Capital (1203).
- **Travel (11):** Join UP! (1141), Coral Travel Украина (1413), TEZ TOUR Украина (1411), TPG (1150), Феерия (410), Поехали с нами (1155), Vidviday (1204), VFS Global (598), ЄВіза (1212), Hyatt Regency Kyiv (1406), MAISON Wedding (1295).
- **Auto (10):** AutoLev (1302), Transparent (1215), ТестАвто (1415), IMPORTCAR (1221), DayDrive (1311), Griznes Auto Group (1303), 7Cars (571), Auto Club Diesel (1428), Eco Auto Service (1224), AlexCars (1417).
- **Education (14):** GoIT (434), Hillel IT School (323), Mate academy (328), Beetroot Academy (362), IT Step Academy (361), DAN.IT Education (1225), Projector Institute (1230), Prometheus (1159), Green Forest (356), Work.ua (1227), Robota.ua (1233), Djinni (1317), EnglishDom (238), Laba (358).
- **Delivery/Food (4):** WE Sushi (1441), Сушия (913), MAFIA (432), Zakaz.ua (336).
- **IT (3):** N-iX (498), Intellias (505), MacPaw (347).
- **Mixed (9):** Сінево (1339), ДІЛА (1352), Добробут (1345), Ескулаб (1354), CSD LAB (1353), Аптека 9-1-1 (679), Аптека Доброго Дня (682), Львівські круасани (337), Aroma Kava (343).

## Исключено не по дублям

- **Premier Palace Hotel Kyiv** — не добавлен: в каталоге уже есть сеть Premier Hotels and Resorts (id 1206, phnr.com), включающая этот отель в описании; отдельная карточка одного отеля сети создала бы путаницу.
- **«Фабрика Мебели»** — добавлена как «Фабрика Мебели Харьков» (id 1476), чтобы не путать с российскими «Фабрика „Кухни РМ"» (871) и «Реформа» (1006).

## Уроки и замечания

- Поиск «Synevo» латиницей дубль НЕ нашёл, а «Сінево» кириллицей — нашёл (id 1339). Проверять оба написания обязательно, особенно для украинских названий.
- У ряда компаний сайты напрямую не открывались (403/429/робот-проверка: Profimebel, Фабрика Мебели Харьков, EvoDesign, White Wood, Dyus, RakiShop, Timeeat, СушіБос) — статус подтверждён поисковой выдачей, это честно указано в statusNote.
- У MyCredit и CreditPlus в описаниях честно указаны жалобы и высокие ставки (до 726% годовых у MyCredit); у Галя Балувана — судебные споры вокруг ТМ и смена собственников в 2025 году.
- Следующим партиям: крупные украинские бренды почти все уже в каталоге — исследователям стоит копать глубже (региональные компании, нишевые сервисы), а не повторять топ-бренды.
