import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { el as dEl, sq as dSq, bg as dBg, ro as dRo, srLatn as dSr, hr as dHr, bs as dBs, mk as dMk, sl as dSl, tr as dTr, type Locale } from "date-fns/locale";

/** Greek is the source of truth; every other language may omit keys (falls back to Greek).
 * Add a language: add an entry to LANGUAGES + a dictionary below. */
export const elDict = {
  "nav.home": "Αρχική", "nav.orders": "Παραγγελίες", "nav.deliveries": "Διανομές", "nav.customers": "Πελάτες", "nav.routes": "Δρομολόγια",
  "c.save": "Αποθήκευση", "c.error": "Σφάλμα", "c.call": "Κλήση", "c.navigate": "Πλοήγηση", "c.orders": "παραγγελίες", "c.total": "Σύνολο", "c.back": "Πίσω",
  "d.welcome": "Καλώς ήρθες", "d.newOrder": "Νέα παραγγελία", "d.newRoute": "Νέο δρομολόγιο", "d.today": "Σήμερα",
  "d.ordersToday": "Παραγγελίες σήμερα", "d.newOrders": "Νέες παραγγελίες", "d.deliveriesToday": "Διανομές σήμερα", "d.pendingDeliveries": "Εκκρεμείς διανομές",
  "d.revenueToday": "Έσοδα σήμερα", "d.expensesToday": "Έξοδα σήμερα", "d.expenses": "έξοδα", "d.net": "καθαρά",
  "d.loadToday": "Προϊόντα για φόρτωμα σήμερα", "d.noLoad": "Δεν υπάρχουν παραγγελίες σε σημερινά δρομολόγια.", "d.todayRoutes": "Σημερινά δρομολόγια", "d.noRoutesToday": "Δεν υπάρχει δρομολόγιο σήμερα.",
  "d.products": "Προϊόντα", "d.history": "Ιστορικό",
  "r.title": "Δρομολόγια", "r.route": "Δρομολόγιο", "r.active": "Ενεργά / Προγραμματισμένα δρομολόγια", "r.history": "Ιστορικό δρομολογίων", "r.none": "Δεν υπάρχουν δρομολόγια",
  "r.historyHint": "Τα δρομολόγια διαγράφονται αυτόματα μετά από 2 μήνες.", "r.revenue": "Έσοδα", "r.expenses": "Έξοδα", "r.net": "Καθαρά",
  "r.when": "Πότε θα γίνει το δρομολόγιο;", "r.expTitle": "Έξοδα δρομολογίου", "r.fuel": "Καύσιμα", "r.tolls": "Διόδια", "r.wear": "Φθορές", "r.food": "Φαγητό",
  "r.totalExp": "Συνολικά έξοδα δρομολογίου", "r.confirm": "Επιβεβαίωση δρομολογίου", "r.created": "Το δρομολόγιο δημιουργήθηκε.", "r.pickDate": "Διάλεξε ημερομηνία.",
  "r.load": "Προϊόντα για φόρτωμα", "r.ordersOf": "Παραγγελίες δρομολογίου", "r.noOrders": "Δεν υπάρχουν παραγγελίες σε αυτό το δρομολόγιο.", "r.delete": "Διαγραφή δρομολογίου",
  "r.deleteAsk": "Διαγραφή δρομολογίου; Οι παραγγελίες θα μείνουν χωρίς δρομολόγιο.", "r.editExp": "Αλλαγή εξόδων", "r.selected": "Επιλεγμένη ημερομηνία",
  "o.route": "Δρομολόγιο", "o.noRoute": "— Χωρίς δρομολόγιο —", "o.searchRoute": "Αναζήτηση ημερομηνίας (π.χ. 15/10)", "o.createRoute": "Δεν υπάρχει δρομολόγιο; Δημιούργησε ένα",
  "del.title": "Διανομές", "del.pending": "εκκρεμείς", "del.delivered": "Παραδόθηκε", "del.start": "Έναρξη διανομής", "del.none": "Δεν υπάρχουν εκκρεμείς διανομές",
  "del.gpsDenied": "Δεν έχουμε πρόσβαση στην τοποθεσία σας. Ενεργοποιήστε την τοποθεσία για να ταξινομήσουμε τις διανομές με βάση την απόσταση.",
  "del.gpsWait": "Αναζήτηση τρέχουσας θέσης…", "del.gpsOk": "Τρέχουσα θέση διανομέα — ταξινόμηση κατά απόσταση", "del.noLoc": "χωρίς τοποθεσία", "del.started": "Η διανομή ξεκίνησε — παρακολουθώ τη θέση σου.",
  "del.todayOnly": "Μόνο σημερινά δρομολόγια", "del.all": "Όλες",
  "a.title": "Αυτόματο «Παραδόθηκε»", "a.on": "ΑΝΟΙΧΤΟ", "a.off": "ΚΛΕΙΣΤΟ", "a.hint": "Τσεκάρει μόνο του την παραγγελία όταν φτάνεις στον πελάτη (η εφαρμογή πρέπει να είναι ανοιχτή).",
  "a.active": "Ενεργό — παρακολουθώ τη θέση σου.", "a.denied": "Δεν δόθηκε άδεια τοποθεσίας.", "a.done": "Παραδόθηκε αυτόματα",
  "p.title": "Το προφίλ μου", "p.first": "Όνομα", "p.last": "Επώνυμο", "p.business": "Όνομα επιχείρησης", "p.phone": "Τηλέφωνο", "p.email": "Email",
  "p.saveChanges": "Αποθήκευση αλλαγών", "p.saved": "Οι αλλαγές αποθηκεύτηκαν.", "p.settings": "Ρυθμίσεις", "p.language": "Γλώσσα", "p.logout": "Αποσύνδεση",
  "p.emailHint": "Αν αλλάξεις email, θα λάβεις μήνυμα επιβεβαίωσης στο νέο email.",
  "s.new": "Νέα", "s.preparing": "Σε προετοιμασία", "s.ready": "Έτοιμη", "s.delivering": "Σε διανομή", "s.delivered": "Παραδόθηκε", "s.cancelled": "Ακυρώθηκε",
  "v.record": "Ηχογράφηση", "v.text": "Από κείμενο", "v.manual": "Χειροκίνητα", "v.tap": "Πάτα για ηχογράφηση", "v.analyzing": "Ανάλυση ηχογράφησης…", "v.stop": "πάτα για τέλος",
  "v.hint": "Πάτα το κουμπί και άφησε τον πελάτη να πει τι θέλει: όνομα, τηλέφωνο, διεύθυνση και προϊόντα. Ενημέρωσε τον πελάτη ότι ηχογραφείται.",
  "v.found": "Βρέθηκε η παρακάτω παραγγελία", "v.confirm": "ΕΠΙΒΕΒΑΙΩΣΗ", "v.fix": "ΔΙΟΡΘΩΣΗ",
};
export type TKey = keyof typeof elDict;
type Dict = Partial<Record<TKey, string>>;

const sr: Dict = {
  "nav.home": "Početna", "nav.orders": "Porudžbine", "nav.deliveries": "Dostave", "nav.customers": "Kupci", "nav.routes": "Ture",
  "c.save": "Sačuvaj", "c.error": "Greška", "c.call": "Poziv", "c.navigate": "Navigacija", "c.orders": "porudžbina", "c.total": "Ukupno", "c.back": "Nazad",
  "d.welcome": "Dobrodošli", "d.newOrder": "Nova porudžbina", "d.newRoute": "Nova tura", "d.today": "Danas",
  "d.ordersToday": "Porudžbine danas", "d.newOrders": "Nove porudžbine", "d.deliveriesToday": "Dostave danas", "d.pendingDeliveries": "Dostave na čekanju",
  "d.revenueToday": "Prihod danas", "d.expensesToday": "Troškovi danas", "d.expenses": "troškovi", "d.net": "neto",
  "d.loadToday": "Proizvodi za utovar danas", "d.noLoad": "Nema porudžbina u današnjim turama.", "d.todayRoutes": "Današnje ture", "d.noRoutesToday": "Danas nema ture.",
  "d.products": "Proizvodi", "d.history": "Istorija",
  "r.title": "Ture", "r.route": "Tura", "r.active": "Aktivne / planirane ture", "r.history": "Istorija tura", "r.none": "Nema tura",
  "r.historyHint": "Ture se automatski brišu posle 2 meseca.", "r.revenue": "Prihod", "r.expenses": "Troškovi", "r.net": "Neto",
  "r.when": "Kada će biti tura?", "r.expTitle": "Troškovi ture", "r.fuel": "Gorivo", "r.tolls": "Putarina", "r.wear": "Habanje", "r.food": "Hrana",
  "r.totalExp": "Ukupni troškovi ture", "r.confirm": "Potvrdi turu", "r.created": "Tura je kreirana.", "r.pickDate": "Izaberite datum.",
  "r.load": "Proizvodi za utovar", "r.ordersOf": "Porudžbine ture", "r.noOrders": "Nema porudžbina u ovoj turi.", "r.delete": "Obriši turu",
  "r.deleteAsk": "Obrisati turu? Porudžbine ostaju bez ture.", "r.editExp": "Izmeni troškove", "r.selected": "Izabrani datum",
  "o.route": "Tura", "o.noRoute": "— Bez ture —", "o.searchRoute": "Traži datum (npr. 15/10)", "o.createRoute": "Nema ture? Napravite je",
  "del.title": "Dostave", "del.pending": "na čekanju", "del.delivered": "Isporučeno", "del.start": "Započni dostavu", "del.none": "Nema dostava na čekanju",
  "del.gpsDenied": "Nemamo pristup vašoj lokaciji. Uključite lokaciju da bismo sortirali dostave po udaljenosti.",
  "del.gpsWait": "Traženje trenutne lokacije…", "del.gpsOk": "Trenutna lokacija — sortirano po udaljenosti", "del.noLoc": "bez lokacije", "del.started": "Dostava je počela — pratim vašu lokaciju.",
  "del.todayOnly": "Samo današnje ture", "del.all": "Sve",
  "a.title": "Automatsko «Isporučeno»", "a.on": "UKLJUČENO", "a.off": "ISKLJUČENO", "a.hint": "Sam označava porudžbinu kada stignete kod kupca (aplikacija mora biti otvorena).",
  "a.active": "Aktivno — pratim vašu lokaciju.", "a.denied": "Dozvola za lokaciju nije data.", "a.done": "Automatski isporučeno",
  "p.title": "Moj profil", "p.first": "Ime", "p.last": "Prezime", "p.business": "Naziv firme", "p.phone": "Telefon", "p.email": "Email",
  "p.saveChanges": "Sačuvaj izmene", "p.saved": "Izmene su sačuvane.", "p.settings": "Podešavanja", "p.language": "Jezik", "p.logout": "Odjava",
  "p.emailHint": "Ako promenite email, dobićete poruku za potvrdu na novi email.",
  "s.new": "Nova", "s.preparing": "U pripremi", "s.ready": "Spremna", "s.delivering": "U dostavi", "s.delivered": "Isporučeno", "s.cancelled": "Otkazana",
  "v.record": "Snimanje", "v.text": "Iz teksta", "v.manual": "Ručno", "v.tap": "Pritisnite za snimanje", "v.analyzing": "Analiza snimka…", "v.stop": "pritisnite za kraj",
  "v.hint": "Pritisnite dugme i pustite kupca da kaže šta želi: ime, telefon, adresu i proizvode. Obavestite kupca da se snima.",
  "v.found": "Pronađena je sledeća porudžbina", "v.confirm": "POTVRDI", "v.fix": "ISPRAVI",
};
const hr: Dict = { ...sr, "nav.orders": "Narudžbe", "c.orders": "narudžbi", "d.newOrder": "Nova narudžba", "d.ordersToday": "Narudžbe danas", "d.newOrders": "Nove narudžbe", "d.noLoad": "Nema narudžbi u današnjim turama.", "d.history": "Povijest", "r.history": "Povijest tura", "r.historyHint": "Ture se automatski brišu nakon 2 mjeseca.", "r.pickDate": "Odaberite datum.", "r.ordersOf": "Narudžbe ture", "r.noOrders": "Nema narudžbi u ovoj turi.", "r.deleteAsk": "Obrisati turu? Narudžbe ostaju bez ture.", "r.selected": "Odabrani datum", "o.searchRoute": "Traži datum (npr. 15/10)", "del.delivered": "Isporučeno", "p.settings": "Postavke", "p.saveChanges": "Spremi promjene", "p.saved": "Promjene su spremljene.", "c.save": "Spremi", "s.new": "Nova", "v.found": "Pronađena je sljedeća narudžba", "p.logout": "Odjava", "p.business": "Naziv tvrtke" };
const bs: Dict = { ...hr, "d.history": "Historija", "r.history": "Historija tura", "p.settings": "Postavke" };
const me: Dict = { ...sr, "r.historyHint": "Ture se automatski brišu nakon 2 mjeseca." };

const sq: Dict = {
  "nav.home": "Kreu", "nav.orders": "Porositë", "nav.deliveries": "Dërgesat", "nav.customers": "Klientët", "nav.routes": "Itineraret",
  "c.save": "Ruaj", "c.error": "Gabim", "c.call": "Telefono", "c.navigate": "Navigim", "c.orders": "porosi", "c.total": "Totali", "c.back": "Mbrapa",
  "d.welcome": "Mirë se vini", "d.newOrder": "Porosi e re", "d.newRoute": "Itinerar i ri", "d.today": "Sot",
  "d.ordersToday": "Porositë sot", "d.newOrders": "Porosi të reja", "d.deliveriesToday": "Dërgesat sot", "d.pendingDeliveries": "Dërgesa në pritje",
  "d.revenueToday": "Të ardhurat sot", "d.expensesToday": "Shpenzimet sot", "d.expenses": "shpenzime", "d.net": "neto",
  "d.loadToday": "Produkte për ngarkim sot", "d.noLoad": "Nuk ka porosi në itineraret e sotme.", "d.todayRoutes": "Itineraret e sotme", "d.noRoutesToday": "Nuk ka itinerar sot.",
  "d.products": "Produktet", "d.history": "Historia",
  "r.title": "Itineraret", "r.route": "Itinerar", "r.active": "Itinerare aktive / të planifikuara", "r.history": "Historia e itinerareve", "r.none": "Nuk ka itinerare",
  "r.historyHint": "Itineraret fshihen automatikisht pas 2 muajsh.", "r.revenue": "Të ardhura", "r.expenses": "Shpenzime", "r.net": "Neto",
  "r.when": "Kur do të bëhet itinerari?", "r.expTitle": "Shpenzimet e itinerarit", "r.fuel": "Karburant", "r.tolls": "Pagesa rruge", "r.wear": "Konsumim", "r.food": "Ushqim",
  "r.totalExp": "Shpenzimet totale", "r.confirm": "Konfirmo itinerarin", "r.created": "Itinerari u krijua.", "r.pickDate": "Zgjidhni datën.",
  "r.load": "Produkte për ngarkim", "r.ordersOf": "Porositë e itinerarit", "r.noOrders": "Nuk ka porosi në këtë itinerar.", "r.delete": "Fshi itinerarin",
  "r.deleteAsk": "Të fshihet itinerari? Porositë mbeten pa itinerar.", "r.editExp": "Ndrysho shpenzimet", "r.selected": "Data e zgjedhur",
  "o.route": "Itinerari", "o.noRoute": "— Pa itinerar —", "o.searchRoute": "Kërko datën (p.sh. 15/10)", "o.createRoute": "Nuk ka itinerar? Krijo një",
  "del.title": "Dërgesat", "del.pending": "në pritje", "del.delivered": "U dorëzua", "del.start": "Fillo dërgesën", "del.none": "Nuk ka dërgesa në pritje",
  "del.gpsDenied": "Nuk kemi qasje në vendndodhjen tuaj. Aktivizoni vendndodhjen për t'i renditur dërgesat sipas distancës.",
  "del.gpsWait": "Duke kërkuar vendndodhjen…", "del.gpsOk": "Vendndodhja aktuale — renditur sipas distancës", "del.noLoc": "pa vendndodhje", "del.started": "Dërgesa filloi — po ndjek vendndodhjen tuaj.",
  "del.todayOnly": "Vetëm itineraret e sotme", "del.all": "Të gjitha",
  "a.title": "«U dorëzua» automatik", "a.on": "NDEZUR", "a.off": "FIKUR", "a.hint": "Shënon vetë porosinë kur arrini te klienti (aplikacioni duhet të jetë i hapur).",
  "a.active": "Aktiv — po ndjek vendndodhjen tuaj.", "a.denied": "Nuk u dha leje për vendndodhjen.", "a.done": "U dorëzua automatikisht",
  "p.title": "Profili im", "p.first": "Emri", "p.last": "Mbiemri", "p.business": "Emri i biznesit", "p.phone": "Telefoni", "p.email": "Email",
  "p.saveChanges": "Ruaj ndryshimet", "p.saved": "Ndryshimet u ruajtën.", "p.settings": "Cilësimet", "p.language": "Gjuha", "p.logout": "Dil",
  "p.emailHint": "Nëse ndryshoni email-in, do të merrni mesazh konfirmimi.",
  "s.new": "E re", "s.preparing": "Në përgatitje", "s.ready": "Gati", "s.delivering": "Në dërgim", "s.delivered": "U dorëzua", "s.cancelled": "Anuluar",
  "v.record": "Regjistrim", "v.text": "Nga teksti", "v.manual": "Manualisht", "v.tap": "Shtyp për regjistrim", "v.analyzing": "Duke analizuar…", "v.stop": "shtyp për të mbaruar",
  "v.hint": "Shtypni butonin dhe lëreni klientin të thotë çfarë dëshiron: emrin, telefonin, adresën dhe produktet. Njoftoni klientin se po regjistrohet.",
  "v.found": "U gjet porosia e mëposhtme", "v.confirm": "KONFIRMO", "v.fix": "KORRIGJO",
};
const bg: Dict = {
  "nav.home": "Начало", "nav.orders": "Поръчки", "nav.deliveries": "Доставки", "nav.customers": "Клиенти", "nav.routes": "Маршрути",
  "c.save": "Запази", "c.error": "Грешка", "c.call": "Обади се", "c.navigate": "Навигация", "c.orders": "поръчки", "c.total": "Общо", "c.back": "Назад",
  "d.welcome": "Добре дошли", "d.newOrder": "Нова поръчка", "d.newRoute": "Нов маршрут", "d.today": "Днес",
  "d.ordersToday": "Поръчки днес", "d.newOrders": "Нови поръчки", "d.deliveriesToday": "Доставки днес", "d.pendingDeliveries": "Чакащи доставки",
  "d.revenueToday": "Приходи днес", "d.expensesToday": "Разходи днес", "d.expenses": "разходи", "d.net": "нето",
  "d.loadToday": "Продукти за товарене днес", "d.noLoad": "Няма поръчки в днешните маршрути.", "d.todayRoutes": "Днешни маршрути", "d.noRoutesToday": "Няма маршрут днес.",
  "d.products": "Продукти", "d.history": "История",
  "r.title": "Маршрути", "r.route": "Маршрут", "r.active": "Активни / планирани маршрути", "r.history": "История на маршрутите", "r.none": "Няма маршрути",
  "r.historyHint": "Маршрутите се изтриват автоматично след 2 месеца.", "r.revenue": "Приходи", "r.expenses": "Разходи", "r.net": "Нето",
  "r.when": "Кога ще бъде маршрутът?", "r.expTitle": "Разходи за маршрута", "r.fuel": "Гориво", "r.tolls": "Пътни такси", "r.wear": "Амортизация", "r.food": "Храна",
  "r.totalExp": "Общи разходи", "r.confirm": "Потвърди маршрута", "r.created": "Маршрутът е създаден.", "r.pickDate": "Изберете дата.",
  "r.load": "Продукти за товарене", "r.ordersOf": "Поръчки в маршрута", "r.noOrders": "Няма поръчки в този маршрут.", "r.delete": "Изтрий маршрута",
  "r.deleteAsk": "Изтриване на маршрута? Поръчките остават без маршрут.", "r.editExp": "Промени разходите", "r.selected": "Избрана дата",
  "o.route": "Маршрут", "o.noRoute": "— Без маршрут —", "o.searchRoute": "Търси дата (напр. 15/10)", "o.createRoute": "Няма маршрут? Създай",
  "del.title": "Доставки", "del.pending": "чакащи", "del.delivered": "Доставено", "del.start": "Започни доставка", "del.none": "Няма чакащи доставки",
  "del.gpsDenied": "Нямаме достъп до местоположението ви. Включете го, за да подредим доставките по разстояние.",
  "del.gpsWait": "Търсене на местоположение…", "del.gpsOk": "Текущо местоположение — подредено по разстояние", "del.noLoc": "без местоположение", "del.started": "Доставката започна — следя местоположението ви.",
  "del.todayOnly": "Само днешни маршрути", "del.all": "Всички",
  "a.title": "Автоматично «Доставено»", "a.on": "ВКЛ.", "a.off": "ИЗКЛ.", "a.hint": "Отбелязва поръчката сама, когато стигнете клиента (приложението трябва да е отворено).",
  "a.active": "Активно — следя местоположението ви.", "a.denied": "Няма разрешение за местоположение.", "a.done": "Доставено автоматично",
  "p.title": "Моят профил", "p.first": "Име", "p.last": "Фамилия", "p.business": "Име на фирмата", "p.phone": "Телефон", "p.email": "Имейл",
  "p.saveChanges": "Запази промените", "p.saved": "Промените са запазени.", "p.settings": "Настройки", "p.language": "Език", "p.logout": "Изход",
  "p.emailHint": "Ако смените имейла, ще получите писмо за потвърждение.",
  "s.new": "Нова", "s.preparing": "В подготовка", "s.ready": "Готова", "s.delivering": "В доставка", "s.delivered": "Доставена", "s.cancelled": "Отказана",
  "v.record": "Запис", "v.text": "От текст", "v.manual": "Ръчно", "v.tap": "Натисни за запис", "v.analyzing": "Анализ на записа…", "v.stop": "натисни за край",
  "v.hint": "Натиснете бутона и оставете клиента да каже какво иска: име, телефон, адрес и продукти. Уведомете клиента, че се записва.",
  "v.found": "Намерена е следната поръчка", "v.confirm": "ПОТВЪРДИ", "v.fix": "КОРИГИРАЙ",
};
const mk: Dict = {
  ...bg,
  "nav.home": "Почетна", "nav.orders": "Нарачки", "nav.deliveries": "Испораки", "nav.customers": "Купувачи", "nav.routes": "Рути",
  "c.save": "Зачувај", "c.orders": "нарачки", "d.welcome": "Добредојдовте", "d.newOrder": "Нова нарачка", "d.newRoute": "Нова рута", "d.today": "Денес",
  "d.ordersToday": "Нарачки денес", "d.newOrders": "Нови нарачки", "d.deliveriesToday": "Испораки денес", "d.pendingDeliveries": "Испораки на чекање",
  "d.revenueToday": "Приходи денес", "d.expensesToday": "Трошоци денес", "d.expenses": "трошоци", "d.loadToday": "Производи за товарење денес",
  "d.todayRoutes": "Денешни рути", "d.noRoutesToday": "Нема рута денес.", "d.products": "Производи", "d.noLoad": "Нема нарачки во денешните рути.",
  "r.title": "Рути", "r.route": "Рута", "r.active": "Активни / планирани рути", "r.history": "Историја на рути", "r.none": "Нема рути", "r.expenses": "Трошоци",
  "r.historyHint": "Рутите автоматски се бришат по 2 месеци.", "r.when": "Кога ќе биде рутата?", "r.expTitle": "Трошоци за рутата", "r.tolls": "Патарини", "r.wear": "Абење",
  "r.totalExp": "Вкупни трошоци", "r.confirm": "Потврди рута", "r.created": "Рутата е креирана.", "r.load": "Производи за товарење", "r.ordersOf": "Нарачки во рутата",
  "r.noOrders": "Нема нарачки во оваа рута.", "r.delete": "Избриши рута", "r.deleteAsk": "Бришење на рутата? Нарачките остануваат без рута.", "r.editExp": "Промени трошоци",
  "o.route": "Рута", "o.noRoute": "— Без рута —", "o.createRoute": "Нема рута? Креирај",
  "del.title": "Испораки", "del.pending": "на чекање", "del.delivered": "Испорачано", "del.start": "Започни испорака", "del.none": "Нема испораки на чекање",
  "del.gpsDenied": "Немаме пристап до вашата локација. Вклучете ја локацијата за да ги подредиме испораките по растојание.",
  "del.gpsWait": "Барање локација…", "del.gpsOk": "Тековна локација — подредено по растојание", "del.noLoc": "без локација", "del.todayOnly": "Само денешни рути", "del.all": "Сите",
  "a.title": "Автоматско «Испорачано»", "a.done": "Автоматски испорачано", "p.title": "Мој профил", "p.last": "Презиме", "p.business": "Име на фирма",
  "p.saveChanges": "Зачувај промени", "p.saved": "Промените се зачувани.", "p.settings": "Поставки", "p.language": "Јазик", "p.logout": "Одјава",
  "s.new": "Нова", "s.preparing": "Во подготовка", "s.ready": "Подготвена", "s.delivering": "Во испорака", "s.delivered": "Испорачана", "s.cancelled": "Откажана",
  "v.record": "Снимање", "v.found": "Пронајдена е следната нарачка", "v.confirm": "ПОТВРДИ", "v.fix": "ПОПРАВИ",
};
const ro: Dict = {
  "nav.home": "Acasă", "nav.orders": "Comenzi", "nav.deliveries": "Livrări", "nav.customers": "Clienți", "nav.routes": "Curse",
  "c.save": "Salvează", "c.error": "Eroare", "c.call": "Sună", "c.navigate": "Navigare", "c.orders": "comenzi", "c.total": "Total", "c.back": "Înapoi",
  "d.welcome": "Bine ai venit", "d.newOrder": "Comandă nouă", "d.newRoute": "Cursă nouă", "d.today": "Azi",
  "d.ordersToday": "Comenzi azi", "d.newOrders": "Comenzi noi", "d.deliveriesToday": "Livrări azi", "d.pendingDeliveries": "Livrări în așteptare",
  "d.revenueToday": "Venituri azi", "d.expensesToday": "Cheltuieli azi", "d.expenses": "cheltuieli", "d.net": "net",
  "d.loadToday": "Produse de încărcat azi", "d.noLoad": "Nu există comenzi în cursele de azi.", "d.todayRoutes": "Cursele de azi", "d.noRoutesToday": "Nu există cursă azi.",
  "d.products": "Produse", "d.history": "Istoric",
  "r.title": "Curse", "r.route": "Cursă", "r.active": "Curse active / programate", "r.history": "Istoricul curselor", "r.none": "Nu există curse",
  "r.historyHint": "Cursele se șterg automat după 2 luni.", "r.revenue": "Venituri", "r.expenses": "Cheltuieli", "r.net": "Net",
  "r.when": "Când va avea loc cursa?", "r.expTitle": "Cheltuielile cursei", "r.fuel": "Combustibil", "r.tolls": "Taxe de drum", "r.wear": "Uzură", "r.food": "Mâncare",
  "r.totalExp": "Total cheltuieli", "r.confirm": "Confirmă cursa", "r.created": "Cursa a fost creată.", "r.pickDate": "Alege data.",
  "r.load": "Produse de încărcat", "r.ordersOf": "Comenzile cursei", "r.noOrders": "Nu există comenzi în această cursă.", "r.delete": "Șterge cursa",
  "r.deleteAsk": "Ștergi cursa? Comenzile rămân fără cursă.", "r.editExp": "Modifică cheltuielile", "r.selected": "Data aleasă",
  "o.route": "Cursă", "o.noRoute": "— Fără cursă —", "o.searchRoute": "Caută data (ex. 15/10)", "o.createRoute": "Nu ai cursă? Creează una",
  "del.title": "Livrări", "del.pending": "în așteptare", "del.delivered": "Livrat", "del.start": "Începe livrarea", "del.none": "Nu există livrări în așteptare",
  "del.gpsDenied": "Nu avem acces la locația ta. Activează locația pentru a sorta livrările după distanță.",
  "del.gpsWait": "Se caută locația…", "del.gpsOk": "Locația curentă — sortat după distanță", "del.noLoc": "fără locație", "del.started": "Livrarea a început — urmăresc locația ta.",
  "del.todayOnly": "Doar cursele de azi", "del.all": "Toate",
  "a.title": "«Livrat» automat", "a.on": "PORNIT", "a.off": "OPRIT", "a.hint": "Bifează singur comanda când ajungi la client (aplicația trebuie să fie deschisă).",
  "a.active": "Activ — urmăresc locația ta.", "a.denied": "Permisiunea de locație a fost refuzată.", "a.done": "Livrat automat",
  "p.title": "Profilul meu", "p.first": "Prenume", "p.last": "Nume", "p.business": "Numele afacerii", "p.phone": "Telefon", "p.email": "Email",
  "p.saveChanges": "Salvează modificările", "p.saved": "Modificările au fost salvate.", "p.settings": "Setări", "p.language": "Limbă", "p.logout": "Deconectare",
  "p.emailHint": "Dacă schimbi emailul, vei primi un mesaj de confirmare.",
  "s.new": "Nouă", "s.preparing": "În pregătire", "s.ready": "Gata", "s.delivering": "În livrare", "s.delivered": "Livrată", "s.cancelled": "Anulată",
  "v.record": "Înregistrare", "v.text": "Din text", "v.manual": "Manual", "v.tap": "Apasă pentru înregistrare", "v.analyzing": "Se analizează…", "v.stop": "apasă pentru final",
  "v.hint": "Apasă butonul și lasă clientul să spună ce dorește: nume, telefon, adresă și produse. Anunță clientul că este înregistrat.",
  "v.found": "S-a găsit următoarea comandă", "v.confirm": "CONFIRMĂ", "v.fix": "CORECTEAZĂ",
};
const sl: Dict = {
  "nav.home": "Domov", "nav.orders": "Naročila", "nav.deliveries": "Dostave", "nav.customers": "Stranke", "nav.routes": "Ture",
  "c.save": "Shrani", "c.error": "Napaka", "c.call": "Pokliči", "c.navigate": "Navigacija", "c.orders": "naročil", "c.total": "Skupaj", "c.back": "Nazaj",
  "d.welcome": "Dobrodošli", "d.newOrder": "Novo naročilo", "d.newRoute": "Nova tura", "d.today": "Danes",
  "d.ordersToday": "Naročila danes", "d.newOrders": "Nova naročila", "d.deliveriesToday": "Dostave danes", "d.pendingDeliveries": "Čakajoče dostave",
  "d.revenueToday": "Prihodki danes", "d.expensesToday": "Stroški danes", "d.expenses": "stroški", "d.net": "neto",
  "d.loadToday": "Izdelki za nalaganje danes", "d.noLoad": "V današnjih turah ni naročil.", "d.todayRoutes": "Današnje ture", "d.noRoutesToday": "Danes ni ture.",
  "d.products": "Izdelki", "d.history": "Zgodovina",
  "r.title": "Ture", "r.route": "Tura", "r.active": "Aktivne / načrtovane ture", "r.history": "Zgodovina tur", "r.none": "Ni tur",
  "r.historyHint": "Ture se samodejno izbrišejo po 2 mesecih.", "r.revenue": "Prihodki", "r.expenses": "Stroški", "r.net": "Neto",
  "r.when": "Kdaj bo tura?", "r.expTitle": "Stroški ture", "r.fuel": "Gorivo", "r.tolls": "Cestnine", "r.wear": "Obraba", "r.food": "Hrana",
  "r.totalExp": "Skupni stroški", "r.confirm": "Potrdi turo", "r.created": "Tura je ustvarjena.", "r.pickDate": "Izberite datum.",
  "r.load": "Izdelki za nalaganje", "r.ordersOf": "Naročila ture", "r.noOrders": "V tej turi ni naročil.", "r.delete": "Izbriši turo",
  "r.deleteAsk": "Izbrišem turo? Naročila ostanejo brez ture.", "r.editExp": "Uredi stroške", "r.selected": "Izbrani datum",
  "o.route": "Tura", "o.noRoute": "— Brez ture —", "o.searchRoute": "Išči datum (npr. 15/10)", "o.createRoute": "Ni ture? Ustvarite jo",
  "del.title": "Dostave", "del.pending": "čakajoče", "del.delivered": "Dostavljeno", "del.start": "Začni dostavo", "del.none": "Ni čakajočih dostav",
  "del.gpsDenied": "Nimamo dostopa do vaše lokacije. Vklopite lokacijo, da razvrstimo dostave po razdalji.",
  "del.gpsWait": "Iskanje lokacije…", "del.gpsOk": "Trenutna lokacija — razvrščeno po razdalji", "del.noLoc": "brez lokacije", "del.started": "Dostava se je začela — spremljam vašo lokacijo.",
  "del.todayOnly": "Samo današnje ture", "del.all": "Vse",
  "a.title": "Samodejno «Dostavljeno»", "a.on": "VKLOPLJENO", "a.off": "IZKLOPLJENO", "a.hint": "Samo označi naročilo, ko prispete do stranke (aplikacija mora biti odprta).",
  "a.active": "Aktivno — spremljam vašo lokacijo.", "a.denied": "Dovoljenje za lokacijo ni bilo dano.", "a.done": "Samodejno dostavljeno",
  "p.title": "Moj profil", "p.first": "Ime", "p.last": "Priimek", "p.business": "Ime podjetja", "p.phone": "Telefon", "p.email": "E-pošta",
  "p.saveChanges": "Shrani spremembe", "p.saved": "Spremembe so shranjene.", "p.settings": "Nastavitve", "p.language": "Jezik", "p.logout": "Odjava",
  "p.emailHint": "Če spremenite e-pošto, boste prejeli sporočilo za potrditev.",
  "s.new": "Novo", "s.preparing": "V pripravi", "s.ready": "Pripravljeno", "s.delivering": "V dostavi", "s.delivered": "Dostavljeno", "s.cancelled": "Preklicano",
  "v.record": "Snemanje", "v.text": "Iz besedila", "v.manual": "Ročno", "v.tap": "Pritisnite za snemanje", "v.analyzing": "Analiza posnetka…", "v.stop": "pritisnite za konec",
  "v.hint": "Pritisnite gumb in pustite stranko, da pove, kaj želi: ime, telefon, naslov in izdelke. Obvestite stranko, da se snema.",
  "v.found": "Najdeno je naslednje naročilo", "v.confirm": "POTRDI", "v.fix": "POPRAVI",
};
const tr: Dict = {
  "nav.home": "Ana sayfa", "nav.orders": "Siparişler", "nav.deliveries": "Teslimatlar", "nav.customers": "Müşteriler", "nav.routes": "Seferler",
  "c.save": "Kaydet", "c.error": "Hata", "c.call": "Ara", "c.navigate": "Yol tarifi", "c.orders": "sipariş", "c.total": "Toplam", "c.back": "Geri",
  "d.welcome": "Hoş geldiniz", "d.newOrder": "Yeni sipariş", "d.newRoute": "Yeni sefer", "d.today": "Bugün",
  "d.ordersToday": "Bugünkü siparişler", "d.newOrders": "Yeni siparişler", "d.deliveriesToday": "Bugünkü teslimatlar", "d.pendingDeliveries": "Bekleyen teslimatlar",
  "d.revenueToday": "Bugünkü gelir", "d.expensesToday": "Bugünkü giderler", "d.expenses": "gider", "d.net": "net",
  "d.loadToday": "Bugün yüklenecek ürünler", "d.noLoad": "Bugünkü seferlerde sipariş yok.", "d.todayRoutes": "Bugünkü seferler", "d.noRoutesToday": "Bugün sefer yok.",
  "d.products": "Ürünler", "d.history": "Geçmiş",
  "r.title": "Seferler", "r.route": "Sefer", "r.active": "Aktif / planlanmış seferler", "r.history": "Sefer geçmişi", "r.none": "Sefer yok",
  "r.historyHint": "Seferler 2 ay sonra otomatik silinir.", "r.revenue": "Gelir", "r.expenses": "Gider", "r.net": "Net",
  "r.when": "Sefer ne zaman?", "r.expTitle": "Sefer giderleri", "r.fuel": "Yakıt", "r.tolls": "Otoyol ücreti", "r.wear": "Yıpranma", "r.food": "Yemek",
  "r.totalExp": "Toplam sefer gideri", "r.confirm": "Seferi onayla", "r.created": "Sefer oluşturuldu.", "r.pickDate": "Tarih seçin.",
  "r.load": "Yüklenecek ürünler", "r.ordersOf": "Seferin siparişleri", "r.noOrders": "Bu seferde sipariş yok.", "r.delete": "Seferi sil",
  "r.deleteAsk": "Sefer silinsin mi? Siparişler seferi olmadan kalır.", "r.editExp": "Giderleri düzenle", "r.selected": "Seçilen tarih",
  "o.route": "Sefer", "o.noRoute": "— Sefer yok —", "o.searchRoute": "Tarih ara (ör. 15/10)", "o.createRoute": "Sefer yok mu? Oluştur",
  "del.title": "Teslimatlar", "del.pending": "bekleyen", "del.delivered": "Teslim edildi", "del.start": "Teslimatı başlat", "del.none": "Bekleyen teslimat yok",
  "del.gpsDenied": "Konumunuza erişimimiz yok. Teslimatları mesafeye göre sıralamak için konumu açın.",
  "del.gpsWait": "Konum aranıyor…", "del.gpsOk": "Mevcut konum — mesafeye göre sıralı", "del.noLoc": "konum yok", "del.started": "Teslimat başladı — konumunuzu izliyorum.",
  "del.todayOnly": "Sadece bugünkü seferler", "del.all": "Tümü",
  "a.title": "Otomatik «Teslim edildi»", "a.on": "AÇIK", "a.off": "KAPALI", "a.hint": "Müşteriye vardığınızda siparişi kendisi işaretler (uygulama açık olmalı).",
  "a.active": "Aktif — konumunuzu izliyorum.", "a.denied": "Konum izni verilmedi.", "a.done": "Otomatik teslim edildi",
  "p.title": "Profilim", "p.first": "Ad", "p.last": "Soyad", "p.business": "İşletme adı", "p.phone": "Telefon", "p.email": "E-posta",
  "p.saveChanges": "Değişiklikleri kaydet", "p.saved": "Değişiklikler kaydedildi.", "p.settings": "Ayarlar", "p.language": "Dil", "p.logout": "Çıkış",
  "p.emailHint": "E-postayı değiştirirseniz yeni adrese onay mesajı gelir.",
  "s.new": "Yeni", "s.preparing": "Hazırlanıyor", "s.ready": "Hazır", "s.delivering": "Dağıtımda", "s.delivered": "Teslim edildi", "s.cancelled": "İptal",
  "v.record": "Ses kaydı", "v.text": "Metinden", "v.manual": "Elle", "v.tap": "Kayıt için dokun", "v.analyzing": "Kayıt analiz ediliyor…", "v.stop": "bitirmek için dokun",
  "v.hint": "Düğmeye basın ve müşterinin ne istediğini söylemesine izin verin: ad, telefon, adres ve ürünler. Müşteriye kayıt yapıldığını söyleyin.",
  "v.found": "Aşağıdaki sipariş bulundu", "v.confirm": "ONAYLA", "v.fix": "DÜZELT",
};

export const LANGUAGES = [
  { code: "el", label: "🇬🇷 Ελληνικά", dict: {} as Dict, locale: dEl, intl: "el-GR" },
  { code: "sq", label: "🇦🇱 Shqip", dict: sq, locale: dSq, intl: "sq-AL" },
  { code: "bg", label: "🇧🇬 Български", dict: bg, locale: dBg, intl: "bg-BG" },
  { code: "ro", label: "🇷🇴 Română", dict: ro, locale: dRo, intl: "ro-RO" },
  { code: "sr", label: "🇷🇸 Srpski", dict: sr, locale: dSr, intl: "sr-Latn-RS" },
  { code: "hr", label: "🇭🇷 Hrvatski", dict: hr, locale: dHr, intl: "hr-HR" },
  { code: "bs", label: "🇧🇦 Bosanski", dict: bs, locale: dBs, intl: "bs-BA" },
  { code: "mk", label: "🇲🇰 Македонски", dict: mk, locale: dMk, intl: "mk-MK" },
  { code: "sl", label: "🇸🇮 Slovenščina", dict: sl, locale: dSl, intl: "sl-SI" },
  { code: "me", label: "🇲🇪 Crnogorski", dict: me, locale: dSr, intl: "sr-Latn-ME" },
  { code: "tr", label: "🇹🇷 Türkçe", dict: tr, locale: dTr, intl: "tr-TR" },
] as const;
export type LangCode = (typeof LANGUAGES)[number]["code"];

const STORAGE = "farm-lang";
type Ctx = { lang: LangCode; setLang: (l: LangCode) => void; t: (k: TKey) => string; locale: Locale; intl: string };
const I18nCtx = createContext<Ctx | null>(null);

export function isLang(v: unknown): v is LangCode {
  return LANGUAGES.some((l) => l.code === v);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("el");
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE);
    if (isLang(saved)) setLangState(saved);
  }, []);
  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    localStorage.setItem(STORAGE, l);
  }, []);
  const entry = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const t = useCallback((k: TKey) => entry.dict[k] ?? elDict[k], [entry]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return <I18nCtx.Provider value={{ lang, setLang, t, locale: entry.locale, intl: entry.intl }}>{children}</I18nCtx.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("I18nProvider missing");
  return c;
}
