from __future__ import annotations

import json
import os
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import gspread
from google.oauth2.service_account import Credentials

VET_TZ = timezone(timedelta(hours=-4))
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

DEFAULT_SPREADSHEET_ID = "1vaAwo19vbNoi-gBpIG8sNpBcsHSnXPlApenRh7iWOfI"
DEFAULT_WORKSHEET_NAME = "Seguimiento_Referidores"
LOCAL_CREDENTIALS_FALLBACK = Path(r"c:\Users\jsequera\Desktop\api_google\gestion-y-control-743aff3b9c8d.json")

HEADERS = [
    "ID_REGISTRO",
    "FECHA_CREACION",
    "REFERIDOR",
    "CANAL_CONTACTO",
    "ESTADO",
    "FECHA_HORA_RESPUESTA",
    "CANTIDAD_REFERIDOS_MOROSOS",
    "MONTO_MINIMO_USD",
    "OBSERVACIONES",
]

CANALES_VALIDOS = [
    "WHATSAPP",
    "CORREO",
    "LLAMADA",
]

ESTADOS_VALIDOS = [
    "CONTACTADO",
    "REPORTE ENVIADO",
    "EN SEGUIMIENTO",
    "COMPROMISO DE PAGO",
    "SIN RESPUESTA",
    "CERRADO",
]

REFERIDORES_LISTA_CERRADA = [
    "Aikomotors",
    "Alejandro Ravelo",
    "Alejandro Vivas",
    "Alexandra Gonzalez",
    "Alexandra Lavie",
    "Álvaro Pérez Kattar",
    "Álvaro Pérez Kattar / Centro Médico La Fe",
    "Álvaro Pérez Kattar / Clínica Juan Griego",
    "Álvaro Pérez Kattar / Textil Charbys",
    "Antonio Bertorelli",
    "Antonio Zubillaga",
    "Arys Auto",
    "Arys Proveedor / Sky Tired",
    "Astrid Sojo",
    "Autolavado Trod Cars Care Ccs",
    "Banco Activo",
    "Banco Plaza",
    "CAEJERB",
    "CAF / Michael Guilarte",
    "Cafetería Express y Laborathorno",
    "Camara de Comercio Caracas",
    "Camara Gastronomica Caracas",
    "Camara Gastronomica Caracas / Asociación de Ganaderos",
    "Camara Gastronomica Caracas / Centro Cultural de Chacao",
    "Carla Garcia",
    "Carlos Cato",
    "Carlos Cordido",
    "CDD - Centro",
    "CDD - ONCORAC",
    "CENTRO",
    "Centro de Diagnostico Docente Las Mercedes",
    "Centro Italo Venezolano de Guayana",
    "Centro Preescolar PUKI PUKI",
    "Cesar Santana (Beto)",
    "Chocobru",
    "Claryluz",
    "Clínica Fénix",
    "Clínica Integral Dental Lido",
    "Clínica La Victoria - IMEVCA",
    "Colegio Jefferson",
    "Daniel Ardila / Clinica Sanatrix",
    "Daniel Ardila / Colegio Jefferson",
    "Digital Valley / Pink Rider",
    "Disfuncional",
    "Disglobal",
    "Domingo Lara",
    "Empire Keeway La California",
    "Enviamed",
    "Evelyn Carvajal",
    "Exelixi",
    "EY",
    "Francisco Llaramendi",
    "Funda Farmacia",
    "Gerardo Diaz",
    "Giovanni Sorrentino / Camara de Comercio Caracas",
    "Giovanni Sorrentino / Empire Keeway La California",
    "Giovanni Sorrentino / Kapital Consultores J-404162429",
    "Giovanni Sorrentino / Lalianxa Travel Network",
    "Giovanni Sorrentino / Operadora Turística Fiesta Travel, C.A.",
    "Giovanni Sorrentino / VEN Asesores",
    "Grupo Express",
    "Grupo Venecor C.A",
    "Grupoidearq C.A",
    "Gustavo Torrealba",
    "Gustavo Torrealba / Daniel Ardila",
    "Gustavo Torrealba / Daniel Ardila / Ronava",
    "Gustavo Torrealba / Hector Carabaño",
    "Gustavo Torrealba / Pedro Vivas",
    "Gustavo Torrealba / Rafael Ramones",
    "Gustavo Torrealba / Valeria Davila",
    "Gustavo Torrealba / Vecino Edificio El Pilón",
    "GYM",
    "Hesperia WTC Valencia",
    "Humberto Martínez",
    "Inquiport",
    "Jairo Morillo",
    "Jefferson",
    "Jenfeld Bertorelli",
    "Jennifer Grau",
    "Jose Antonio Guerrero",
    "José Bravo",
    "Josmir Barreto",
    "Juan Carlos Recao",
    "KAIROS DE REASEGUROS",
    "Kapital Consultores J-404162429",
    "Lateral",
    "LM",
    "LM - Productores",
    "LM Canal Alterno",
    "LM Canal Alterno / Farmacias San Ignacio",
    "Logistika",
    "Luis Javier Mendoza",
    "MANMAR CORRETAJE DE SEGUROS",
    "Maria Andreina Villasmil",
    "Mariana Alvarado",
    "Mariana Alvarado / Carla Rivero",
    "Mariana Alvarado / Fritz Venezuela",
    "Marilin Martínez",
    "Meritop",
    "Miguel Santana",
    "Milagros Castro",
    "Oriana Silva",
    "P.R.C. 333",
    "Pablo Bravo",
    "Pedro Razz",
    "Pedro Villasmil",
    "Pedro Vivas / Miguel Santana",
    "R4",
    "Rafael Guerrero",
    "Rafael Guerrero - Beco",
    "Rafael Rodriguez - RONAVA",
    "Rafael Villasmil",
    "Roderick Muñoz",
    "Roger Swidorowicz",
    "Sebastian Bertorelli",
    "Sebastian Bertorelli Vepagos",
    "Seguros Horizonte",
    "SEIDSA",
    "SEIDSA / Detektor",
    "SEIDSA / Quenia Guerra",
    "SEIDSA / Seguros Corporativos",
    "Sigma Dental",
    "Silicon Valley",
    "SOFITASA - BNC",
    "SPB",
    "Tesita",
    "Traki",
    "Unidad Quirurgica del Centro",
    "VAAC",
    "Valeven",
    "Valle Arriba Golf",
    "Vicente Amengual",
    "Vision Biz",
    "Visualizando",
    "WORLD RE",
    "Wualter Rivas",
    "Yaniela Parra",
]


def normalize_key(text: str) -> str:
    """Accent-insensitive, whitespace-collapsed uppercase key for matching."""
    cleaned = re.sub(r"\s+", " ", str(text or "").strip())
    decomposed = unicodedata.normalize("NFKD", cleaned)
    no_accents = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return no_accents.upper()


def to_upper_clean(text: str) -> str:
    """Standardize text to UPPERCASE preserving readability."""
    cleaned = re.sub(r"\s+", " ", str(text or "").strip())
    return cleaned.upper()


_REF_LOOKUP: dict[str, str] = {normalize_key(name): to_upper_clean(name) for name in REFERIDORES_LISTA_CERRADA}
_CANAL_LOOKUP: dict[str, str] = {normalize_key(c): c for c in CANALES_VALIDOS}
_ESTADO_LOOKUP: dict[str, str] = {normalize_key(e): e for e in ESTADOS_VALIDOS}


def resolve_referidor(value: str) -> str:
    key = normalize_key(value)
    if key not in _REF_LOOKUP:
        raise ValueError("Debes seleccionar un referidor válido de la lista cerrada.")
    return _REF_LOOKUP[key]


def resolve_canal(value: str) -> str:
    key = normalize_key(value)
    if key not in _CANAL_LOOKUP:
        raise ValueError(f"Canal de contacto inválido. Opciones permitidas: {', '.join(CANALES_VALIDOS)}.")
    return _CANAL_LOOKUP[key]


def resolve_estado(value: str) -> str:
    key = normalize_key(value)
    if key not in _ESTADO_LOOKUP:
        raise ValueError(f"Estado inválido. Opciones permitidas: {', '.join(ESTADOS_VALIDOS)}.")
    return _ESTADO_LOOKUP[key]


def _normalize_creds(info: dict[str, Any]) -> dict[str, Any]:
    if "private_key" in info and isinstance(info["private_key"], str):
        info["private_key"] = info["private_key"].replace("\\n", "\n")
    return info


def _load_credentials_info() -> dict[str, Any] | None:
    raw_json = os.getenv("GOOGLE_CREDENTIALS_JSON", "").strip()
    if raw_json:
        return _normalize_creds(json.loads(raw_json))

    cred_file = os.getenv("GOOGLE_CREDENTIALS_FILE", "").strip()
    if cred_file and Path(cred_file).is_file():
        return _normalize_creds(json.loads(Path(cred_file).read_text(encoding="utf-8")))

    # Render Secret Files default location
    render_secret = Path("/etc/secrets/gestion-y-control-743aff3b9c8d.json")
    if render_secret.is_file():
        return _normalize_creds(json.loads(render_secret.read_text(encoding="utf-8")))

    if LOCAL_CREDENTIALS_FALLBACK.is_file():
        return _normalize_creds(json.loads(LOCAL_CREDENTIALS_FALLBACK.read_text(encoding="utf-8")))

    return None


def is_configured() -> bool:
    try:
        return _load_credentials_info() is not None
    except Exception:
        return False


def _get_worksheet() -> gspread.Worksheet:
    info = _load_credentials_info()
    if not info:
        raise RuntimeError(
            "No se encontraron las credenciales de servicio (GOOGLE_CREDENTIALS_JSON o GOOGLE_CREDENTIALS_FILE)."
        )

    spreadsheet_id = os.getenv("GOOGLE_SHEET_ID", DEFAULT_SPREADSHEET_ID).strip() or DEFAULT_SPREADSHEET_ID
    worksheet_name = os.getenv("GOOGLE_SHEET_WORKSHEET", DEFAULT_WORKSHEET_NAME).strip() or DEFAULT_WORKSHEET_NAME

    creds = Credentials.from_service_account_info(info, scopes=SCOPES)
    client = gspread.authorize(creds)
    sh = client.open_by_key(spreadsheet_id)

    try:
        ws = sh.worksheet(worksheet_name)
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(title=worksheet_name, rows=1000, cols=len(HEADERS))

    # Auto-create headers if worksheet is empty
    first_row = ws.row_values(1)
    if not first_row:
        ws.append_row(HEADERS, value_input_option="USER_ENTERED")
        try:
            ws.format(
                "A1:I1",
                {
                    "backgroundColor": {"red": 0.169, "green": 0.298, "blue": 0.494},
                    "textFormat": {"bold": True, "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0}},
                    "horizontalAlignment": "CENTER",
                },
            )
            ws.freeze(rows=1)
        except Exception:
            pass

    return ws


def save_seguimiento(
    *,
    referidor: str,
    canal: str,
    estado: str,
    fecha_respuesta: str,
    cantidad_referidos_morosos: int,
    monto_minimo_usd: float,
    observaciones: str,
) -> dict[str, Any]:
    ref_upper = resolve_referidor(referidor)
    canal_upper = resolve_canal(canal)
    estado_upper = resolve_estado(estado)

    if cantidad_referidos_morosos <= 0:
        raise ValueError("La cantidad de referidos morosos debe ser mayor a 0.")
    if monto_minimo_usd <= 0:
        raise ValueError("El monto total mínimo a cancelar (USD) debe ser mayor a 0.")

    obs_upper = to_upper_clean(observaciones)
    if not obs_upper:
        raise ValueError("Las observaciones son obligatorias.")

    now_ve = datetime.now(VET_TZ)
    id_registro = f"REF-{now_ve.strftime('%Y%m%d-%H%M%S')}"
    fecha_creacion = now_ve.strftime("%Y-%m-%d %H:%M:%S")
    fecha_resp_clean = fecha_respuesta.replace("T", " ").strip().upper()
    monto_clean = round(float(monto_minimo_usd), 2)

    ws = _get_worksheet()
    row = [
        id_registro,
        fecha_creacion,
        ref_upper,
        canal_upper,
        estado_upper,
        fecha_resp_clean,
        int(cantidad_referidos_morosos),
        monto_clean,
        obs_upper,
    ]
    ws.append_row(row, value_input_option="USER_ENTERED")

    return {
        "id": id_registro,
        "fechaCreacion": fecha_creacion,
        "referidor": ref_upper,
        "canal": canal_upper,
        "estado": estado_upper,
        "fechaRespuesta": fecha_resp_clean,
        "cantidadReferidosMorosos": int(cantidad_referidos_morosos),
        "montoMinimoUsd": monto_clean,
        "observaciones": obs_upper,
    }


def list_seguimientos(referidor_filter: str | None = None) -> list[dict[str, Any]]:
    ws = _get_worksheet()
    rows = ws.get_all_values()
    if not rows or len(rows) <= 1:
        return []

    filter_key = normalize_key(referidor_filter) if referidor_filter else ""
    registros: list[dict[str, Any]] = []

    for r in reversed(rows[1:]):
        if not any(cell.strip() for cell in r):
            continue
        padded = r + [""] * (len(HEADERS) - len(r))
        ref_val = padded[2].strip()
        if filter_key and filter_key not in normalize_key(ref_val):
            continue

        cant_val: int | str = padded[6].strip()
        try:
            cant_val = int(float(cant_val.replace(",", ""))) if cant_val else 0
        except ValueError:
            pass

        monto_val: float | str = padded[7].strip()
        try:
            monto_clean = re.sub(r"[^0-9.\-]", "", monto_val.replace(",", ""))
            monto_val = float(monto_clean) if monto_clean else 0.0
        except ValueError:
            pass

        registros.append(
            {
                "id": padded[0].strip(),
                "fechaCreacion": padded[1].strip(),
                "referidor": ref_val,
                "canal": padded[3].strip(),
                "estado": padded[4].strip(),
                "fechaRespuesta": padded[5].strip(),
                "cantidadReferidosMorosos": cant_val,
                "montoMinimoUsd": monto_val,
                "observaciones": padded[8].strip(),
            }
        )
        if len(registros) >= 500:
            break

    return registros
