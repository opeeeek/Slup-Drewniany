// SłupDrewniany – okno aplikacji (Windows, WebView2) dla interfejsu HTML z katalogu web/.
// Funkcje hosta dostępne w JavaScript:
//   hostRequest(json) – {id, op: "open"|"save", ...}; odpowiedź przez window.__hostReply(id, wynik)
//   hostStore(json)   – autozapis stanu do %LOCALAPPDATA%\SlupDrewniany\autosave.json
//   hostTitle(tekst)  – tytuł okna
// Bez składnika WebView2 aplikacja otwiera się w domyślnej przeglądarce (plik HTML w folderze danych).
package main

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unicode/utf16"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
)

//go:embed web/index.html
var page string

const appName = "SlupDrewniany"

var (
	user32   = syscall.NewLazyDLL("user32.dll")
	shell32  = syscall.NewLazyDLL("shell32.dll")
	comdlg32 = syscall.NewLazyDLL("comdlg32.dll")

	procMessageBoxW     = user32.NewProc("MessageBoxW")
	procGetDpiForSystem = user32.NewProc("GetDpiForSystem")
	procGetSystemMetric = user32.NewProc("GetSystemMetrics")
	procShellExecuteW   = shell32.NewProc("ShellExecuteW")
	procGetOpenFileName = comdlg32.NewProc("GetOpenFileNameW")
	procGetSaveFileName = comdlg32.NewProc("GetSaveFileNameW")
)

func utf16z(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }

func messageBox(hwnd uintptr, title, text string, flags uintptr) {
	procMessageBoxW.Call(hwnd, uintptr(unsafe.Pointer(utf16z(text))), uintptr(unsafe.Pointer(utf16z(title))), flags)
}

func shellOpen(path string) {
	procShellExecuteW.Call(0, uintptr(unsafe.Pointer(utf16z("open"))), uintptr(unsafe.Pointer(utf16z(path))), 0, 0, 1)
}

func dataDir() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base, _ = os.UserConfigDir()
	}
	if base == "" {
		base = "."
	}
	d := filepath.Join(base, appName)
	_ = os.MkdirAll(d, 0o755)
	return d
}

func systemDPI() int {
	if procGetDpiForSystem.Find() == nil {
		if r, _, _ := procGetDpiForSystem.Call(); r > 0 {
			return int(r)
		}
	}
	return 96
}

func systemMetric(i int) int { r, _, _ := procGetSystemMetric.Call(uintptr(i)); return int(r) }

// ---------------------------------------------------------------- okna Otwórz / Zapisz (comdlg32)
type openFileName struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	Flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        uintptr
	dwReserved        uint32
	FlagsEx           uint32
}

const (
	ofnOverwritePrompt = 0x00000002
	ofnHideReadOnly    = 0x00000004
	ofnNoChangeDir     = 0x00000008
	ofnPathMustExist   = 0x00000800
	ofnFileMustExist   = 0x00001000
	ofnExplorer        = 0x00080000
)

// filtr: pary opis / wzorzec rozdzielone znakiem zerowym
func filterFor(kind string) (string, string) {
	switch kind {
	case "html":
		return "Raport HTML (*.html)\x00*.html;*.htm\x00Wszystkie pliki (*.*)\x00*.*\x00\x00", "html"
	case "odt":
		return "Dokument OpenDocument (*.odt)\x00*.odt\x00Wszystkie pliki (*.*)\x00*.*\x00\x00", "odt"
	case "dxf":
		return "Rysunek DXF (*.dxf)\x00*.dxf\x00Wszystkie pliki (*.*)\x00*.*\x00\x00", "dxf"
	}
	return "Projekt słupa (*.slup)\x00*.slup\x00Plik JSON (*.json)\x00*.json\x00Wszystkie pliki (*.*)\x00*.*\x00\x00", "slup"
}

func fileDialog(owner uintptr, save bool, kind, name string) (string, bool) {
	filter, ext := filterFor(kind)
	buf := make([]uint16, 4096)
	if name != "" {
		n := utf16.Encode([]rune(name))
		if len(n) < len(buf)-1 {
			copy(buf, n)
		}
	}
	fl := utf16.Encode([]rune(filter))
	ofn := openFileName{
		hwndOwner:   owner,
		lpstrFilter: &fl[0],
		nFilterIndex: 1,
		lpstrFile:   &buf[0],
		nMaxFile:    uint32(len(buf)),
		lpstrDefExt: utf16z(ext),
		Flags:       ofnExplorer | ofnHideReadOnly | ofnNoChangeDir | ofnPathMustExist,
	}
	ofn.lStructSize = uint32(unsafe.Sizeof(ofn))
	var r uintptr
	if save {
		ofn.Flags |= ofnOverwritePrompt
		ofn.lpstrTitle = utf16z("Zapisz jako")
		r, _, _ = procGetSaveFileName.Call(uintptr(unsafe.Pointer(&ofn)))
	} else {
		ofn.Flags |= ofnFileMustExist
		ofn.lpstrTitle = utf16z("Otwórz projekt")
		r, _, _ = procGetOpenFileName.Call(uintptr(unsafe.Pointer(&ofn)))
	}
	if r == 0 {
		return "", false
	}
	return syscall.UTF16ToString(buf), true
}

// ---------------------------------------------------------------- żądania z JavaScript
type hostReq struct {
	ID      int    `json:"id"`
	Op      string `json:"op"`
	Path    string `json:"path"`
	Name    string `json:"name"`
	Content string `json:"content"`
	B64     bool   `json:"b64"`
	Filter  string `json:"filter"`
}

type hostRes struct {
	Ok      bool   `json:"ok"`
	Path    string `json:"path,omitempty"`
	Content string `json:"content,omitempty"`
	Err     string `json:"err,omitempty"`
}

func handle(owner uintptr, q hostReq) hostRes {
	switch q.Op {
	case "open":
		p, ok := fileDialog(owner, false, q.Filter, "")
		if !ok {
			return hostRes{}
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return hostRes{Err: err.Error()}
		}
		return hostRes{Ok: true, Path: p, Content: string(b)}
	case "save":
		p := q.Path
		if p == "" {
			var ok bool
			p, ok = fileDialog(owner, true, q.Filter, q.Name)
			if !ok {
				return hostRes{}
			}
		}
		data := []byte(q.Content)
		if q.B64 {
			d, err := base64.StdEncoding.DecodeString(q.Content)
			if err != nil {
				return hostRes{Err: err.Error()}
			}
			data = d
		}
		if err := os.WriteFile(p, data, 0o644); err != nil {
			return hostRes{Err: err.Error()}
		}
		return hostRes{Ok: true, Path: p}
	}
	return hostRes{Err: "nieznana operacja: " + q.Op}
}

func jsonStr(v interface{}) string { b, _ := json.Marshal(v); return string(b) }

// tryb awaryjny – bez WebView2: strona w domyślnej przeglądarce (zapis plików przez pobieranie)
func fallback(dir string) {
	p := filepath.Join(dir, appName+".html")
	if err := os.WriteFile(p, []byte(page), 0o644); err != nil {
		messageBox(0, appName, "Nie można zapisać pliku: "+err.Error(), 0x10)
		return
	}
	messageBox(0, appName, "Nie znaleziono składnika Microsoft Edge WebView2 Runtime (standardowo obecny w Windows 10/11).\n\n"+
		"Aplikacja zostanie otwarta w domyślnej przeglądarce – obliczenia działają tak samo, a projekty zapisywane są do folderu Pobrane.\n\n"+
		"Aby korzystać z wersji okienkowej, zainstaluj WebView2 Runtime:\nhttps://developer.microsoft.com/microsoft-edge/webview2/", 0x40)
	shellOpen(p)
}

func main() {
	dir := dataDir()
	dpi := systemDPI()
	w0, h0 := 1440*dpi/96, 920*dpi/96
	if sw, sh := systemMetric(0), systemMetric(1); sw > 0 && sh > 0 {
		if w0 > sw*92/100 {
			w0 = sw * 92 / 100
		}
		if h0 > sh*88/100 {
			h0 = sh * 88 / 100
		}
	}
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     os.Getenv("SLUP_DEBUG") != "",
		AutoFocus: true,
		DataPath:  filepath.Join(dir, "webview"),
		WindowOptions: webview2.WindowOptions{
			Title:  "SłupDrewniany – słupy drewniane wg Eurokodu 5",
			Width:  uint(w0),
			Height: uint(h0),
			IconId: 1,
			Center: true,
		},
	})
	if w == nil {
		fallback(dir)
		return
	}
	defer w.Destroy()
	hwnd := uintptr(w.Window())
	autosave := filepath.Join(dir, "autosave.json")

	_ = w.Bind("hostRequest", func(msg string) bool {
		var q hostReq
		if err := json.Unmarshal([]byte(msg), &q); err != nil {
			return false
		}
		go w.Dispatch(func() {
			res := handle(hwnd, q)
			w.Eval("window.__hostReply(" + jsonStr(q.ID) + "," + jsonStr(res) + ")")
		})
		return true
	})
	_ = w.Bind("hostStore", func(data string) bool {
		tmp := autosave + ".tmp"
		if err := os.WriteFile(tmp, []byte(data), 0o644); err != nil {
			return false
		}
		return os.Rename(tmp, autosave) == nil
	})
	_ = w.Bind("hostTitle", func(t string) bool {
		w.Dispatch(func() { w.SetTitle(t) })
		return true
	})
	init := "window.__HOST=true;"
	if b, err := os.ReadFile(autosave); err == nil && len(strings.TrimSpace(string(b))) > 0 && json.Valid(b) {
		init += "window.__AUTOSAVE=" + string(b) + ";"
	}
	w.Init(init)
	w.SetHtml(page)
	w.Run()
}
