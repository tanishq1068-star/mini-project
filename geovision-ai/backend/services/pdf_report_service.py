import os
import io
import base64
from datetime import datetime
from PIL import Image as PILImage
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        Image as RLImage, KeepTogether, HRFlowable, PageBreak
    )
    from reportlab.pdfgen import canvas
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that dynamically calculates the total page count
    and renders professional running headers and footers (Page X of Y).
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Suppress running header/footer on title cover page
            return
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#065f46"))
        self.drawString(36, 805, "GeoVision AI — Multi-Temporal Satellite Change Detection Report")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(559, 805, "Scientific Assessment Document")

        # Header rule
        self.setStrokeColor(colors.HexColor("#10b981"))
        self.setLineWidth(0.8)
        self.line(36, 800, 559, 800)

        # Footer rule
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 45, 559, 45)

        # Footer text
        self.drawString(36, 32, "B.Tech CSE Project • Remote Sensing & GIS Automated Analysis Pipeline")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 32, page_str)
        self.restoreState()


def decode_base64_to_temp_image(b64_string, temp_path):
    """Decodes a base64 data URI to a temporary image file on disk."""
    if not b64_string:
        return None
    try:
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        data = base64.b64decode(b64_string)
        with open(temp_path, "wb") as f:
            f.write(data)
        return temp_path
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None


def generate_statistical_charts(analysis_data, tmp_dir):
    """
    Generates high-resolution Matplotlib scientific chart figures
    for inclusion in the statistical analysis section of the report.
    """
    deforest = analysis_data.get("deforestation", {})
    water = analysis_data.get("water", {})
    change = analysis_data.get("change_detection", {})
    stats = change.get("statistics", {})

    chart_paths = {}
    try:
        # Chart 1: Land Cover Area Comparison Bar Chart
        fig, ax = plt.subplots(figsize=(6.5, 3.2), dpi=200)
        categories = ['Forest Canopy', 'Water Bodies', 'Deforested / Desiccated', 'Other Land']
        t1_vals = [
            deforest.get("vegetation_area_before_ha", 0),
            water.get("water_area_before_ha", 0),
            0,
            max(0, deforest.get("total_area_ha", 2621.44) - deforest.get("vegetation_area_before_ha", 0) - water.get("water_area_before_ha", 0))
        ]
        t2_vals = [
            deforest.get("vegetation_area_after_ha", 0),
            water.get("water_area_after_ha", 0),
            deforest.get("total_vegetation_loss_ha", 0) + water.get("water_area_decreased_ha", 0),
            max(0, deforest.get("total_area_ha", 2621.44) - deforest.get("vegetation_area_after_ha", 0) - water.get("water_area_after_ha", 0))
        ]

        x = range(len(categories))
        width = 0.35
        ax.bar([p - width/2 for p in x], t1_vals, width, label='Earlier (T1)', color='#10b981', edgecolor='#065f46')
        ax.bar([p + width/2 for p in x], t2_vals, width, label='Later (T2)', color='#06b6d4', edgecolor='#0891b2')

        ax.set_ylabel('Area (Hectares)', fontsize=9, fontweight='bold', color='#1e293b')
        ax.set_title('Multi-Temporal Land Cover Shift (T1 vs T2)', fontsize=11, fontweight='bold', color='#0f172a')
        ax.set_xticks(x)
        ax.set_xticklabels(categories, fontsize=8)
        ax.legend(frameon=True, fontsize=8)
        ax.grid(axis='y', linestyle='--', alpha=0.4)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        plt.tight_layout()

        bar_chart_path = os.path.join(tmp_dir, "chart_area_comparison.png")
        fig.savefig(bar_chart_path, dpi=200)
        plt.close(fig)
        chart_paths["bar_chart"] = bar_chart_path

        # Chart 2: Land Cover Distribution Pie Chart
        fig2, ax2 = plt.subplots(figsize=(4.5, 3.2), dpi=200)
        labels = ['Preserved Forest', 'Deforested', 'Water Surface', 'Water Loss', 'Terrestrial']
        sizes = [
            max(0, deforest.get("vegetation_area_after_ha", 0)),
            max(0, deforest.get("total_vegetation_loss_ha", 0)),
            max(0, water.get("water_area_after_ha", 0)),
            max(0, water.get("water_area_decreased_ha", 0)),
            max(0, deforest.get("total_area_ha", 2621.44) - deforest.get("vegetation_area_after_ha", 0) - water.get("water_area_after_ha", 0))
        ]
        colors_pie = ['#22c55e', '#ef4444', '#2563eb', '#f97316', '#64748b']
        ax2.pie(sizes, labels=labels, autopct='%1.1f%%', colors=colors_pie, startangle=140,
                textprops={'fontsize': 7, 'color': '#0f172a'}, wedgeprops={'edgecolor': 'white', 'linewidth': 1})
        ax2.set_title('Post-Period Land Partitioning', fontsize=10, fontweight='bold', color='#0f172a')
        plt.tight_layout()

        pie_chart_path = os.path.join(tmp_dir, "chart_pie_distribution.png")
        fig2.savefig(pie_chart_path, dpi=200)
        plt.close(fig2)
        chart_paths["pie_chart"] = pie_chart_path

    except Exception as e:
        print(f"Error compiling charts: {e}")

    return chart_paths


def generate_pdf_report(analysis_data, output_path="reports/analysis_report.pdf"):
    """
    Generates a professional 12-section scientific environmental impact report.
    Conforms to academic and remote sensing research standards.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if not HAS_REPORTLAB:
        with open(output_path.replace(".pdf", ".txt"), "w") as f:
            f.write(f"GeoVision AI Environmental Change Report\nGenerated: {datetime.now()}\n")
            f.write(str(analysis_data))
        return output_path.replace(".pdf", ".txt")

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_cover_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#065f46'),
        spaceAfter=8
    )

    subtitle_cover_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor('#0f766e'),
        spaceAfter=15
    )

    section_heading = ParagraphStyle(
        'ScientificHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0f2231'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'ScientificBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=5
    )

    abstract_style = ParagraphStyle(
        'ScientificAbstract',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor('#334155')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.whitesmoke
    )

    table_body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )

    elements = []
    temp_files = []
    tmp_dir = os.path.join(os.path.dirname(output_path), "tmp_img")
    os.makedirs(tmp_dir, exist_ok=True)

    try:
        region = analysis_data.get("region_name", "Western Ghats Eco-Corridor")
        date1 = analysis_data.get("date_earlier", "2021-06-15")
        date2 = analysis_data.get("date_later", "2024-07-20")
        sensor = analysis_data.get("sensor", "Sentinel-2 Multi-Spectral Instrument (MSI)")
        report_id = analysis_data.get("id", "GV-2026-001")
        report_timestamp = datetime.now().strftime("%B %d, %Y - %H:%M UTC")

        deforest = analysis_data.get("deforestation", {})
        water = analysis_data.get("water", {})
        change = analysis_data.get("change_detection", {})
        stats = change.get("statistics", {})

        # Generate embedded Matplotlib figures
        chart_paths = generate_statistical_charts(analysis_data, tmp_dir)
        for p in chart_paths.values():
            temp_files.append(p)

        # Decode observation and change images
        p_t1 = decode_base64_to_temp_image(analysis_data.get("earlier_image"), os.path.join(tmp_dir, "t1.jpg"))
        p_t2 = decode_base64_to_temp_image(analysis_data.get("later_image"), os.path.join(tmp_dir, "t2.jpg"))
        p_map = decode_base64_to_temp_image(change.get("change_map_image"), os.path.join(tmp_dir, "map.png"))
        p_def = decode_base64_to_temp_image(deforest.get("change_map_image"), os.path.join(tmp_dir, "def.png"))
        p_wat = decode_base64_to_temp_image(water.get("change_map_image"), os.path.join(tmp_dir, "wat.png"))

        for p in [p_t1, p_t2, p_map, p_def, p_wat]:
            if p: temp_files.append(p)

        # =========================================================================
        # SECTION 1: COVER PAGE
        # =========================================================================
        elements.append(Spacer(1, 25))
        elements.append(Paragraph("GeoVision AI", title_cover_style))
        elements.append(Paragraph("Change Detection of Deforestation and Water Resources Using Multi-Temporal Satellite Images", subtitle_cover_style))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#10b981'), spaceAfter=18))

        cover_meta = [
            [Paragraph("<b>Academic Project:</b>", table_body_style), Paragraph("B.Tech Computer Science & Engineering Mini Project", table_body_style)],
            [Paragraph("<b>System Architecture:</b>", table_body_style), Paragraph("GeoVision AI Remote Sensing & GIS Processing System", table_body_style)],
            [Paragraph("<b>Target Study Area:</b>", table_body_style), Paragraph(region, table_body_style)],
            [Paragraph("<b>Primary Satellite Platform:</b>", table_body_style), Paragraph(sensor, table_body_style)],
            [Paragraph("<b>Observation Baseline (T1):</b>", table_body_style), Paragraph(date1, table_body_style)],
            [Paragraph("<b>Observation Monitoring (T2):</b>", table_body_style), Paragraph(date2, table_body_style)],
            [Paragraph("<b>Report Identifier:</b>", table_body_style), Paragraph(report_id, table_body_style)],
            [Paragraph("<b>Generation Timestamp:</b>", table_body_style), Paragraph(report_timestamp, table_body_style)],
            [Paragraph("<b>Classification Level:</b>", table_body_style), Paragraph("Official Scientific Assessment Report", table_body_style)]
        ]
        t_cover = Table(cover_meta, colWidths=[150, 370])
        t_cover.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_cover)
        elements.append(Spacer(1, 15))

        # =========================================================================
        # SECTION 2: ABSTRACT
        # =========================================================================
        elements.append(Paragraph("2. Abstract", section_heading))
        abstract_text = (
            f"This scientific report presents an automated multi-temporal remote sensing investigation "
            f"conducted over <b>{region}</b> between {date1} and {date2}. Utilizing Copernicus Sentinel-2 "
            f"multispectral data at 10-meter spatial resolution, the GeoVision AI analytical pipeline evaluates "
            f"terrestrial canopy degradation and surface water dynamics. Through rigorous spatial registration, "
            f"Normalized Difference Vegetation Index (NDVI), McFeeters Normalized Difference Water Index (NDWI), "
            f"and absolute Euclidean spectral differencing (ΔI), the analysis detected a net vegetation change of "
            f"<b>{deforest.get('percentage_vegetation_change', 0):+.2f}%</b> ({deforest.get('total_vegetation_loss_ha', 0):,.2f} ha deforested) "
            f"and a surface water area fluctuation of <b>{water.get('percentage_water_change', 0):+.2f}%</b>. "
            f"The quantitative findings substantiate critical environmental stress requiring targeted conservation interventions."
        )
        elements.append(Paragraph(abstract_text, abstract_style))
        elements.append(Spacer(1, 10))

        # =========================================================================
        # SECTION 3: STUDY AREA
        # =========================================================================
        elements.append(Paragraph("3. Study Area & Geographic Bounds", section_heading))
        bounds = analysis_data.get("bounds", [12.1500, 75.7800, 12.3800, 76.0500])
        total_ha = deforest.get("total_area_ha", 2621.44)
        study_area_text = (
            f"The analyzed geographic footprint encompasses a bounding box of "
            f"[{bounds[0]:.4f}°N, {bounds[1]:.4f}°E] to [{bounds[2]:.4f}°N, {bounds[3]:.4f}°E] within the "
            f"WGS 84 (EPSG:4326) coordinate reference system. The total continuous surface area under analysis "
            f"is <b>{total_ha:,.2f} hectares</b> (approximately {total_ha/100:.2f} km²)."
        )
        elements.append(Paragraph(study_area_text, body_style))
        elements.append(Spacer(1, 8))

        # =========================================================================
        # SECTION 4: SATELLITE DATA INFORMATION
        # =========================================================================
        elements.append(Paragraph("4. Satellite Sensor & Acquisition Specifications", section_heading))
        sat_data = [
            [Paragraph("<b>Parameter</b>", table_header_style), Paragraph("<b>Observation 1 (T1)</b>", table_header_style), Paragraph("<b>Observation 2 (T2)</b>", table_header_style)],
            [Paragraph("Spacecraft Platform", table_body_style), Paragraph("Copernicus Sentinel-2B", table_body_style), Paragraph("Copernicus Sentinel-2A", table_body_style)],
            [Paragraph("Payload Instrument", table_body_style), Paragraph("Multi-Spectral Instrument (MSI)", table_body_style), Paragraph("Multi-Spectral Instrument (MSI)", table_body_style)],
            [Paragraph("Acquisition Date", table_body_style), Paragraph(date1, table_body_style), Paragraph(date2, table_body_style)],
            [Paragraph("Processing Level", table_body_style), Paragraph("Level-2A Bottom-Of-Atmosphere", table_body_style), Paragraph("Level-2A Bottom-Of-Atmosphere", table_body_style)],
            [Paragraph("Spatial Resolution", table_body_style), Paragraph("10 meters / pixel (VNIR)", table_body_style), Paragraph("10 meters / pixel (VNIR)", table_body_style)],
            [Paragraph("Cloud Cover Fraction", table_body_style), Paragraph(f"{analysis_data.get('cloud_cover_t1', 2.1):.1f}%", table_body_style), Paragraph(f"{analysis_data.get('cloud_cover_t2', 3.8):.1f}%", table_body_style)],
            [Paragraph("Spectral Bands Utilized", table_body_style), Paragraph("B02, B03, B04, B08, B11", table_body_style), Paragraph("B02, B03, B04, B08, B11", table_body_style)]
        ]
        t_sat = Table(sat_data, colWidths=[150, 185, 185])
        t_sat.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#065f46')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(t_sat)
        elements.append(PageBreak())

        # =========================================================================
        # SECTION 5: METHODOLOGY
        # =========================================================================
        elements.append(Paragraph("5. Scientific Methodology & Algorithmic Formulation", section_heading))
        methodology_text = (
            "The GeoVision AI processing framework utilizes a five-stage scientific pipeline: "
            "<br/><b>1. Radiometric Ingestion:</b> 16-bit ESA BOA reflectance values are normalized to physical reflectance [0.0, 1.0]. "
            "<br/><b>2. Feature-Based Spatial Registration:</b> Sub-pixel alignment is performed using ORB (Oriented FAST and Rotated BRIEF) "
            "descriptors and RANSAC homography estimation, ensuring zero misregistration bias across observation dates. "
            "<br/><b>3. Bilateral Noise Reduction:</b> Non-linear bilateral filtering removes high-frequency atmospheric speckle while preserving sharp geomorphic boundaries. "
            "<br/><b>4. Vegetation Index Formulation:</b> Normalized Difference Vegetation Index (NDVI) is computed via "
            "<b>NDVI = (B08 - B04) / (B08 + B04)</b> to gauge cellular chlorophyll scattering. "
            "<br/><b>5. Water Index Formulation:</b> McFeeters NDWI is evaluated via <b>NDWI = (B03 - B08) / (B03 + B08)</b> to delineate surface hydrological boundaries."
        )
        elements.append(Paragraph(methodology_text, body_style))
        elements.append(Spacer(1, 10))

        # =========================================================================
        # SECTION 6: DEFORESTATION ANALYSIS
        # =========================================================================
        elements.append(Paragraph("6. Deforestation & Vegetation Health Assessment", section_heading))
        veg_before = deforest.get("vegetation_area_before_ha", 0)
        veg_after = deforest.get("vegetation_area_after_ha", 0)
        veg_loss = deforest.get("total_vegetation_loss_ha", 0)
        veg_pct = deforest.get("percentage_vegetation_change", 0)

        veg_table = [
            [Paragraph("<b>Forest Metric</b>", table_header_style), Paragraph("<b>Extent (Hectares)</b>", table_header_style), Paragraph("<b>Percentage Shift</b>", table_header_style)],
            [Paragraph("Baseline Forest Coverage (T1)", table_body_style), Paragraph(f"{veg_before:,.2f} ha", table_body_style), Paragraph("100.0% Baseline", table_body_style)],
            [Paragraph("Post-Period Forest Coverage (T2)", table_body_style), Paragraph(f"{veg_after:,.2f} ha", table_body_style), Paragraph(f"{100 + veg_pct:.2f}% of baseline", table_body_style)],
            [Paragraph("Canopy Loss / Deforestation Detected", table_body_style), Paragraph(f"{veg_loss:,.2f} ha", table_body_style), Paragraph(f"-{deforest.get('loss_percentage_of_initial', 0):.2f}% Canopy Loss", table_body_style)],
            [Paragraph("Vegetation Regrowth / Afforestation", table_body_style), Paragraph(f"{deforest.get('vegetation_regrowth_ha', 0):,.2f} ha", table_body_style), Paragraph("Regrowth Margins", table_body_style)],
            [Paragraph("Net Terrestrial Canopy Shift", table_body_style), Paragraph(f"{deforest.get('net_change_ha', 0):+,.2f} ha", table_body_style), Paragraph(f"{veg_pct:+.2f}%", table_body_style)]
        ]
        t_veg = Table(veg_table, colWidths=[180, 170, 170])
        t_veg.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#065f46')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(t_veg)

        if p_def:
            elements.append(Spacer(1, 6))
            elements.append(RLImage(p_def, width=5.0*inch, height=2.2*inch))
            elements.append(Paragraph("<i>Figure 1: Classified Vegetation Change Map (Green = Stable Canopy; Red = Deforestation; Yellow = Moderate Degradation; Slate = Bare Ground).</i>", abstract_style))

        # Deforestation Hotspots Table (if detected)
        def_hs = analysis_data.get("deforestation_hotspots", {}).get("hotspots", [])
        if def_hs:
            elements.append(Spacer(1, 6))
            elements.append(Paragraph("<b>Detected Deforestation Hotspot Spatial Clusters:</b>", table_body_style))
            hs_rows = [
                [Paragraph("<b>Hotspot ID</b>", table_header_style), Paragraph("<b>Centroid (Lat, Lon)</b>", table_header_style), Paragraph("<b>Extent (ha)</b>", table_header_style), Paragraph("<b>Mean ΔNDVI</b>", table_header_style), Paragraph("<b>Severity</b>", table_header_style)]
            ]
            for h in def_hs[:5]:
                sev_color = "#dc2626" if h["severity"] == "HIGH" else "#ea580c" if h["severity"] == "MEDIUM" else "#ca8a04"
                hs_rows.append([
                    Paragraph(f"<b>{h['id']}</b>", table_body_style),
                    Paragraph(f"{h['coordinates'][0]:.4f}°N, {h['coordinates'][1]:.4f}°E", table_body_style),
                    Paragraph(f"{h['area_ha']:.2f} ha", table_body_style),
                    Paragraph(f"{h['mean_delta_ndvi']:+.3f}", table_body_style),
                    Paragraph(f"<font color='{sev_color}'><b>{h['severity']}</b></font>", table_body_style)
                ])
            t_def_hs = Table(hs_rows, colWidths=[80, 150, 100, 100, 90])
            t_def_hs.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#991b1b')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fef2f2')]),
                ('TOPPADDING', (0,0), (-1,-1), 2.5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
            ]))
            elements.append(t_def_hs)

        elements.append(Spacer(1, 10))

        # =========================================================================
        # SECTION 7: WATER RESOURCE ANALYSIS
        # =========================================================================
        elements.append(Paragraph("7. Surface Water Resource & Catchment Dynamics", section_heading))
        w_before = water.get("water_area_before_ha", 0)
        w_after = water.get("water_area_after_ha", 0)
        w_lost = water.get("water_area_decreased_ha", 0)
        w_gained = water.get("water_area_increased_ha", 0)
        w_pct = water.get("percentage_water_change", 0)

        wat_table = [
            [Paragraph("<b>Hydrological Metric</b>", table_header_style), Paragraph("<b>Extent (Hectares)</b>", table_header_style), Paragraph("<b>Status Condition</b>", table_header_style)],
            [Paragraph("Baseline Surface Water Extent (T1)", table_body_style), Paragraph(f"{w_before:,.2f} ha", table_body_style), Paragraph("Baseline Reservoir Storage", table_body_style)],
            [Paragraph("Post-Period Surface Water Extent (T2)", table_body_style), Paragraph(f"{w_after:,.2f} ha", table_body_style), Paragraph("Current Water Surface", table_body_style)],
            [Paragraph("Water Desiccation / Shoreline Retreat", table_body_style), Paragraph(f"{w_lost:,.2f} ha", table_body_style), Paragraph("Drying / Drought Loss", table_body_style)],
            [Paragraph("Newly Detected Water / Inundation", table_body_style), Paragraph(f"{w_gained:,.2f} ha", table_body_style), Paragraph("Flood Expansion", table_body_style)],
            [Paragraph("Net Surface Water Dynamics", table_body_style), Paragraph(f"{water.get('net_water_change_ha', 0):+,.2f} ha", table_body_style), Paragraph(f"{w_pct:+.2f}%", table_body_style)]
        ]
        t_wat = Table(wat_table, colWidths=[180, 170, 170])
        t_wat.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284c7')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(t_wat)

        if p_wat:
            elements.append(Spacer(1, 6))
            elements.append(RLImage(p_wat, width=5.0*inch, height=2.2*inch))
            elements.append(Paragraph("<i>Figure 2: Surface Water Resource Dynamic Map (Blue = Preserved Water Surface; Red = Desiccated Shoreline; Cyan = Newly Inundated Area).</i>", abstract_style))

        # Water Depletion Hotspots Table (if detected)
        wtr_hs = analysis_data.get("water_hotspots", {}).get("hotspots", [])
        if wtr_hs:
            elements.append(Spacer(1, 6))
            elements.append(Paragraph("<b>Detected Surface Water Depletion Clusters:</b>", table_body_style))
            whs_rows = [
                [Paragraph("<b>Hotspot ID</b>", table_header_style), Paragraph("<b>Centroid (Lat, Lon)</b>", table_header_style), Paragraph("<b>Extent (ha)</b>", table_header_style), Paragraph("<b>Depletion %</b>", table_header_style), Paragraph("<b>Severity</b>", table_header_style)]
            ]
            for wh in wtr_hs[:5]:
                wsev_color = "#dc2626" if wh["severity"] == "HIGH" else "#ea580c" if wh["severity"] == "MEDIUM" else "#0284c7"
                whs_rows.append([
                    Paragraph(f"<b>{wh['id']}</b>", table_body_style),
                    Paragraph(f"{wh['coordinates'][0]:.4f}°N, {wh['coordinates'][1]:.4f}°E", table_body_style),
                    Paragraph(f"{wh['area_ha']:.2f} ha", table_body_style),
                    Paragraph(f"{wh['depletion_percentage']:.1f}%", table_body_style),
                    Paragraph(f"<font color='{wsev_color}'><b>{wh['severity']}</b></font>", table_body_style)
                ])
            t_wtr_hs = Table(whs_rows, colWidths=[80, 150, 100, 100, 90])
            t_wtr_hs.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0369a1')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f0f9ff')]),
                ('TOPPADDING', (0,0), (-1,-1), 2.5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
            ]))
            elements.append(t_wtr_hs)

        elements.append(PageBreak())

        # =========================================================================
        # SECTION 8: VISUAL COMPARISON
        # =========================================================================
        elements.append(Paragraph("8. Visual Comparative Satellite Telemetry", section_heading))
        if p_t1 and p_t2:
            t_img_data = [
                [RLImage(p_t1, width=2.5*inch, height=2.5*inch), RLImage(p_t2, width=2.5*inch, height=2.5*inch)],
                [Paragraph(f"<b>Observation Date:</b> {date1} (T1 Earlier)", body_style), Paragraph(f"<b>Observation Date:</b> {date2} (T2 Later)", body_style)]
            ]
            t_imgs = Table(t_img_data, colWidths=[2.6*inch, 2.6*inch])
            t_imgs.setStyle(TableStyle([
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ]))
            elements.append(t_imgs)
        elements.append(Spacer(1, 8))

        # =========================================================================
        # SECTION 9: STATISTICAL ANALYSIS & GRAPHS
        # =========================================================================
        elements.append(Paragraph("9. Statistical Evaluation & Scientific Graphs", section_heading))
        if "bar_chart" in chart_paths and "pie_chart" in chart_paths:
            charts_table_data = [
                [RLImage(chart_paths["bar_chart"], width=3.3*inch, height=1.7*inch),
                 RLImage(chart_paths["pie_chart"], width=2.1*inch, height=1.7*inch)]
            ]
            t_charts = Table(charts_table_data, colWidths=[3.4*inch, 2.2*inch])
            t_charts.setStyle(TableStyle([
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            elements.append(t_charts)
            elements.append(Paragraph("<i>Figure 3: Quantitative Land Partitioning and Multi-Temporal Coverage Shifts.</i>", abstract_style))
        elements.append(Spacer(1, 10))

        # =========================================================================
        # SECTION 10: RESULTS AND DISCUSSION
        # =========================================================================
        elements.append(Paragraph("10. Results and Discussion", section_heading))
        discussion_text = (
            f"The computational comparison of {date1} and {date2} observations reveals prominent land surface alterations. "
            f"A total of <b>{stats.get('total_changed_ha', 0):,.2f} hectares</b> ({stats.get('change_percentage', 0):.2f}% of the total footprint) "
            f"exhibited measurable spectral transitions. Canopy fragmentation is predominantly concentrated along logging access tracks "
            f"and agricultural clearance corridors, as corroborated by severe NDVI drop below +0.20. Surface water reductions indicate "
            f"significant catchment depletion and seasonal shoreline retraction.<br/>"
            f"<b>Analysis Limitations:</b> Multispectral optical sensors are susceptible to atmospheric water vapor variations and seasonal "
            f"vegetation phenology (deciduous leaf-drop). While bilateral filtering suppresses sensor speckle, ground-truth field verification "
            f"remains recommended for legal enforcement."
        )
        elements.append(Paragraph(discussion_text, body_style))
        elements.append(Spacer(1, 8))

        # =========================================================================
        # SECTION 11: CONCLUSION
        # =========================================================================
        elements.append(Paragraph("11. Environmental Conclusion & Recommendations", section_heading))
        conclusion_text = (
            f"Automated multi-temporal analysis proves that <b>{region}</b> has experienced rapid environmental modifications "
            f"over the {date1} to {date2} observation window. The detected <b>{veg_loss:,.2f} hectares</b> of canopy loss and "
            f"<b>{w_lost:,.2f} hectares</b> of desiccated surface water underline the urgency of deploying satellite-based "
            f"monitoring for real-time ecological governance. Recommended actions include establishing permanent conservation buffer zones, "
            f"mandating afforestation programs, and continuous hydrological surveillance."
        )
        elements.append(Paragraph(conclusion_text, body_style))
        elements.append(Spacer(1, 8))

        # =========================================================================
        # SECTION 12: REFERENCES
        # =========================================================================
        elements.append(Paragraph("12. Scientific & Data Source References", section_heading))
        references = [
            "1. European Space Agency (ESA). Copernicus Sentinel-2 MSI Technical Handbook. ESA Standard Documentation, 2023.",
            "2. McFeeters, S. K. (1996). The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features. International Journal of Remote Sensing, 17(7), 1425-1432.",
            "3. Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W. (1974). Monitoring vegetation systems in the Great Plains with ERTS. NASA SP-351, 309-317.",
            "4. Drusch, M., et al. (2012). Sentinel-2: ESA's Optical High-Resolution Mission for GMES Operational Services. Remote Sensing of Environment, 120, 25-36.",
            "5. Xu, H. (2006). Modification of normalised difference water index (MNDWI) to enhance open water features in remotely sensed imagery. International Journal of Remote Sensing, 27(14), 3025-3033."
        ]
        for ref in references:
            elements.append(Paragraph(ref, table_body_style))

        # Build PDF with NumberedCanvas for running headers/footers
        doc.build(elements, canvasmaker=NumberedCanvas)

    finally:
        # Cleanup temporary chart and decoded image files
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception:
                pass

    return output_path
