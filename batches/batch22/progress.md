# Партия 22 — итог (23.11.2026)

**Добавлено 114 новых проверенных украинских компаний. Каталог: 1240 → 1354, подтверждено getoverview.**

По категориям: shops 165→178 (+13), finance 151→161 (+10), delivery 80→86 (+6), food 77→82 (+5), beauty 181→197 (+16), auto 106→121 (+15), realestate 139→157 (+18), education 113→124 (+11), it 96→102 (+6), travel 132→146 (+14). Отзывов по-прежнему 0.

Все 114 добавлены только координатором через addcompany (id 1241–1354) после личной проверки дублей через searchcompanies без фильтра категории, по русскому и латинскому написанию, без дефисов и кавычек. Выборочно перепроверены через getcompany (1241 Slosser, 1328 Євразія, 1354 Ескулаб — имена, категории, описания совпадают). Подагенты (10 групп) готовили только payload-файлы, artifact.invoke_action и app.db не трогали. Всего проверено 145 кандидатов, пропущено 31.

## Добавлено — 114, по нишам

**Beauty (16):** Digital Dental Clinic, Slosser, Esteva Clinic, BeautyPro, Клиника эстетической медицины Мирославы Новосильской, Vitalis, TheZub, Brillant Dental, Добробут, Сінево, ДІЛА, Ескулаб, CSD LAB, Оберіг, ISIDA, VIVA.
**Realestate (18):** NovaBudova, Greenwood, ZEZMAN, VD Group, Greenville, Quoroom, City Lviv Development, AVR Development, РМБУД, Франківський Дім, Kovcheg, Svarog, MEGABUILD, MAKHNO Studio, YODEZEEN, Yakusha Design, SVOYA studio, loft buro.
**Shops (13):** MebliRoMax, MEBLAR, Kachanini, МІК Меблі, Унімебель, Artbruno, Меблі 7я, WOWIN, BigMebli, Restyle, МебельОК, Меблі Вам, Edelweiss Design.
**Finance (10):** Укрексімбанк, Креді Агріколь Банк, Сенс Банк, Dragon Capital, ICU, Ilyashev & Partners, Василь Кісіль і Партнери, BDO Ukraine, Kreston Ukraine, Kyiv Consulting.
**Travel (14):** Яструб-Тур, Дива Країни, Ukrainian Adventures, OFIT Travel, Kyivtrip, СТуК, KTG, 2EU, Leopolis Hotel, Rudolfo Hotel, Olympic Hotel, Fine Wedding, MAISON Wedding, ROMANTIC.
**Auto (15):** АвтоХрестоматія (предоплата 50%), Avto Profi, AutoLev (предоплата ~$150), JustAcar, CarSage, Автопідбір, Griznes Auto Group, Garage Racer, Lucky Cars, NNauto, DayDrive (залог 10%), AutoGo, Ukr-Prokat, AIS AutoTrade, Львів Сервіс (ремонт техники).
**Education (11):** Djinni, DOU, GRC.ua, Happy Monday, Jobs.ua, robot_dreams, Cambridge.ua, Grade.ua, International House Kyiv, EnglisHouse, EnglishOffice.
**Delivery (6):** LOKO, Сільпо, Domino's Pizza Украина, il Molino, Hellboy Pizza, NOVUS.
**Food (5):** Мама Манана, Євразія, Канапа, Veterano Pizza, Первак.
**IT (6):** HyperHost, Binotel, Ringostat, Promodo, Netpeak, ELEKS.

## Пропущено — дубли (30, уже в каталоге — с id)

- Beauty: Eurodent (1235), Клініка 119 (1162), AND Клиника (1236), Храпач (1166), ЧБ Чернова (1163), Elast (1038), Жанві (1171), Оксфорд Медікал (684).
- Realestate: SAGA Development (354), Київміськбуд (321, как «Киевгорстрой»).
- Shops: Світ Меблів (1050), Aroma Kava (343), Львівські круасани (337, дважды в разных группах).
- Finance: Ощадбанк (155), Райффайзен Банк Украина (242), ПУМБ (156), Asters (1065).
- Travel: Visa Land (621).
- Education: Prometheus (1159), ArceMa Ukraine (943).
- Delivery/Food: MONOпицца (469), Milk Bar (366).
- IT: HostPro (502), CityHost (501), Serpstat (867), SoftServe (495).
- Мед/аптеки: Аптека 9-1-1 (679), Аптека Подорожник (678).
- MAISON Wedding — внутренний дубль между группами 5 и 10, добавлена один раз.

## Исключено не по дублям

- «Поїхали з нами» (poehali-s-nami.com) — не добавлена: имя совпадает с уже имеющейся «Поехали с нами» (1155, poehalisnami.ua), домен другой — риск клона/двойника, решать не стал.
- Domino's Pizza — добавлена как «Domino's Pizza Украина» (dominos.ua), чтобы не было коллизии нормализации с российской Domino's Pizza (161, dominos.ru); пометка об этом — в statusNote.
- «Євразія» (Киев, evrasia.in.ua) — добавлена как есть, коллизии с петербургской «Евразией» (1086, evrasia.spb.ru) не произошло: получен новый id 1328.

## Оговорки, честно внесённые в statusNote/описания

- Предоплата: АвтоХрестоматія 50%, AutoLev ~$150, DayDrive залог 10%, MebliRoMax 50%, BigMebli 50% (встречается и от 5% — уточнять), Унімебель — мебель по предоплате.
- Сінево — в 2024 году сообщалось об аресте здания главного офиса (статус дела не проверялся); Ескулаб — сообщения о попытке рейдерского захвата; NOVUS — логистический центр повреждён ракетным ударом 25.11.2025, магазины работают; ZEZMAN/Kovcheg — заявленная доходность 8–12% это обещание, а не гарантия; Dragon Capital, Ескулаб — «в сети есть жалобы/предупреждения».
- У ряда компаний телефоны/email взяты только из справочников/каталогов, а не с официальных сайтов (отмечено в statusNote); неподтверждённые поля оставлены пустыми.

## Файлы

- `final-to-add.json` — итоговые 114 payload-объектов.
- `group1_beauty.json` … `group10_franchise_med.json` — исходные payload-файлы 10 групп.
