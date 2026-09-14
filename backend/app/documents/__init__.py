"""Document processing for RAG (Day 3).

Extracts text/tables from PDF statements (PyMuPDF / pdfplumber), normalizes
them and chunks content while preserving company, year, statement type and
page/source metadata.
"""
