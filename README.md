# SłupDrewniany – słupy drewniane wg Eurokodu 5

Program do wymiarowania i sprawdzania słupów drewnianych wg **PN-EN 1995-1-1** (z Załącznikiem Krajowym PL),
z odpornością ogniową wg **PN-EN 1995-1-2**, kombinacjami wg **PN-EN 1990**, klasami drewna wg **PN-EN 338:2016**
i **PN-EN 14080:2013** oraz generatorami obciążeń wg **PN-EN 1991-1-1, -1-3, -1-4**.
Oprawa wizualna i zakres funkcji odpowiadają programowi wzorcowemu BelkaŻB.

## Uruchomienie

| Plik | Opis |
|---|---|
| `SlupDrewniany.exe` | aplikacja okienkowa Windows 10/11 (WebView2). Projekty `.slup`, autozapis w `%LOCALAPPDATA%\SlupDrewniany`. Bez WebView2 Runtime otwiera się w domyślnej przeglądarce. |
| `dist/SlupDrewniany.html` | ta sama aplikacja jako pojedynczy plik HTML – działa w każdej nowoczesnej przeglądarce (zapis przez pobieranie pliku, autozapis w przeglądarce). |

Skróty: **F2** – raport, **Ctrl+S** – zapisz, **Ctrl+Shift+S** – zapisz jako, **Ctrl+O** – otwórz, **Ctrl+N** – nowy, **Ctrl+P** – drukuj.

## Zakres funkcji (odpowiedniki BelkaŻB)

- **Pasek górny**: nazwa elementu, plik, Nowy / Otwórz / Zapisz / Zapisz jako, Drukuj / PDF, Raport HTML, motyw jasny/ciemny, „O programie”, status (✔ / ✖ / uwagi, η<sub>max</sub>).
- **Zakładki**: Dane · Przekrój i materiał · Wykresy N, M, V, u · Stateczność · Rysunek i zestawienie · Podsumowanie · Raport obliczeń.
- **Dane**: grupy pól z listami wartości, pola „auto” (puste = wartość automatyczna, wpisana = nadpisanie), podpowiedzi i objaśnienia; pasek szybkich wyników; **dobór przekroju** (wymiary handlowe) i **dobór klasy drewna** przy zadanym wytężeniu; interaktywny schemat (kliknij słup, podporę, obciążenie); obwiednie SGN; do **10 słupów w jednym projekcie**.
- **Obciążenia**: stałe, użytkowe (kategorie A–H), śnieg, wiatr, inne (ψ podane), wyjątkowe; siły w głowicy z mimośrodami, siły poziome i momenty, obciążenia rozłożone (cała wysokość lub odcinek), siły na dowolnej wysokości, warianty ± ; klasa trwania każdego obciążenia; **generatory**: z powierzchni zbierania (z redukcją α<sub>n</sub>), śnieg (strefy ZK PL), wiatr (strefy i kategorie terenu ZK PL).
- **Podsumowanie**: karty wyników, tabela sprawdzeń z paskami wykorzystania, statusem, kombinacją i miejscem; **odhaczanie** (automatyczne odznaczanie niespełnionych), objaśnienia punktów normy, okno **„jak obliczono”** (wzór → podstawienie → wynik), „pokaż →”.
- **Raport**: pełny (cały tok obliczeń z podstawieniami), statyka, **raport własny** (edytowalny, zapisywany w projekcie), opcjonalnie z odwołaniami do norm; eksport **HTML**, **.odt** (LibreOffice/Word) i druk/PDF.
- **Rysunek**: widoki słupa, przekrój A–A, oparcie i głowica, stężenia, zestawienie drewna; eksport **DXF** (AutoCAD R12, mm 1:1).

## Zakres obliczeń

- **Materiały**: C14–C50, D18–D80, GL20h–GL32h, GL20c–GL32c, LVL (dane producenta), materiał własny; γ<sub>M</sub>, k<sub>mod</sub>, k<sub>def</sub>, k<sub>h</sub>, k<sub>sys</sub>, k<sub>cr</sub>, β<sub>c</sub>, k<sub>fi</sub> – automatycznie z możliwością nadpisania.
- **Przekroje**: prostokątny, okrągły (moment wypadkowy, k<sub>m</sub> = 1), **wielogałęziowy z przekładkami/nakładkami** (zał. C.3: λ<sub>ef</sub>, η z tab. C.1 zależnie od klasy trwania, warunki C.3.1, siły w łącznikach C.18); osłabienie otworami.
- **Statyka**: MES w dwóch płaszczyznach, podstawa przegubowa/utwierdzona (także podatnie k<sub>φ</sub>), głowica swobodna/przegubowa/utwierdzona/przesuwna, stężenia pośrednie.
- **Kombinacje**: 6.10 lub 6.10a/b, każde obciążenie jako wiodące, **podzbiory obciążeń zmiennych** (k<sub>mod</sub> wg najkrótszego obciążenia – wykrywa decydującą kombinację samych obciążeń stałych), γ<sub>G,inf</sub>, warianty wiatru ±, wyjątkowe i pożarowe 6.11b, SGU charakterystyczne i quasi-stałe.
- **SGN**: 6.1.2, 6.1.4, 6.1.6, 6.1.7 (ścinanie dwukierunkowe), 6.2.3, 6.2.4; **stateczność 6.3.2** z długościami wyboczeniowymi z **zagadnienia własnego MES** (lub podanymi ręcznie); **zwichrzenie 6.3.3** (6.31–6.35); **analiza II rzędu z imperfekcjami** (5.4.4, E<sub>mean</sub>/γ<sub>M</sub>) jako metoda decydująca lub kontrolna; stężenia 9.2.5.2; smukłość graniczna (zalecenie).
- **Oparcie**: docisk do podwaliny i belki na głowicy (6.1.5, k<sub>c,90</sub>, l<sub>ef</sub> = l + 30 mm), docisk blachy do betonu (PN-EN 1992-1-1, 6.7), siły do zaprojektowania zakotwienia (odrywanie, V, M).
- **SGU**: przemieszczenia poziome u<sub>inst</sub>, u<sub>fin</sub> (2.3.2.2), skrócenie osiowe.
- **Pożar**: zwęglanie β<sub>n</sub>, okładziny (t<sub>ch</sub>, t<sub>f</sub>, k<sub>2</sub>, k<sub>3</sub>), d<sub>ef</sub> = d<sub>char,n</sub> + k<sub>0</sub>d<sub>0</sub>, strony ogrzewane, przesunięcie środka ciężkości, wyboczenie i zwichrzenie przekroju resztkowego.

## Założenia do potwierdzenia

- Klasy trwania wg ZK PL: **śnieg – krótkotrwałe, wiatr – chwilowe**, użytkowe stropów – średniotrwałe, magazyny – długotrwałe (zmienne w oknie obciążenia).
- Granice przemieszczeń poziomych domyślnie **l/300 (u<sub>inst</sub>)** i **l/150 (u<sub>fin</sub>)** – PN-EN 1995-1-1 ich nie podaje (do uzgodnienia).
- W analizie II rzędu domyślnie warunek liniowy σ<sub>c</sub>/f<sub>c</sub> + σ<sub>m</sub>/f<sub>m</sub> ≤ 1 (zachowawczo); można przełączyć na postać 6.19/6.20.
- Pożar słupa wielogałęziowego: zwęglanie ścian w szczelinach przyjęto zachowawczo ze wszystkich stron.
- Połączenia (kotwy, łączniki przekładek) – program podaje siły; samo połączenie projektuje się osobno (rozdz. 8).

## Weryfikacja

`node tests/engine.test.js` – 34 testy porównujące silnik z obliczeniami ręcznymi (k<sub>mod</sub>, k<sub>h</sub>, k<sub>c</sub>, k<sub>crit</sub>,
długości wyboczeniowe 0,5/0,7/1,0/2,0·L i ze stężeniem, momenty i ugięcia wzorcowe, N<sub>Ed</sub> z 6.10b, zwęglanie, λ<sub>ef</sub> zał. C, generatory śniegu i wiatru).

## Budowanie

```bash
node build.js
```

```bash
cd host && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../SlupDrewniany.exe .
```

`build.js` łączy `src/` (index.html, css, js) w `dist/SlupDrewniany.html` i `host/web/index.html` (osadzany w exe).
Zasoby Windows (ikona, manifest DPI) – `host/winres/`, generowane do `host/rsrc_windows_*.syso` poleceniem
`go run github.com/tc-hib/go-winres@v0.3.3 make --in winres/winres.json --out rsrc` (w katalogu `host`).

## Struktura

- `src/js/engine.js` – silnik obliczeń (bez zależności, działa też w Node),
- `src/js/norm.js` – objaśnienia punktów norm (streszczenia własne),
- `src/js/draw.js` – rysunki SVG,
- `src/js/report.js` – raport, „jak obliczono”, eksport .odt,
- `src/js/dxf.js` – eksport DXF,
- `src/js/ui.js`, `src/css/app.css`, `src/index.html` – interfejs,
- `host/main.go` – okno Windows (WebView2), okna Otwórz/Zapisz, autozapis.

Program jest narzędziem pomocniczym – wyniki wymagają weryfikacji przez osobę z uprawnieniami budowlanymi.
