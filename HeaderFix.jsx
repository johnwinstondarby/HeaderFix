#target "InDesign"
#targetengine "HeaderFix"

/*
HeaderFix v1.0
Read-only audit for TLDR/, MAINBODY/, MORE/, and REFERENCES/.
Required result: paragraph style H1 with no local overrides.
ExtendScript / ECMAScript 3 compatible.
*/

(function () {
    var VERSION = "1.0";
    var STYLE_NAME = "H1";
    var HEADERS = ["TLDR/", "MAINBODY/", "MORE/", "REFERENCES/"];
    var rows = [];
    var counts = null;
    var ui = {};

    if (app.documents.length === 0) {
        alert("HeaderFix v" + VERSION + "\n\nOpen an InDesign document before running HeaderFix.");
        return;
    }

    buildUI();
    scan();
    ui.win.show();

    function scan() {
        var doc = app.activeDocument;
        var seen = {};
        var oldRedraw = null;
        var s, p, story, para, name;

        rows = [];
        counts = {
            found: 0,
            pass: 0,
            override: 0,
            wrong: 0,
            missing: 0,
            unknown: 0,
            fallback: 0
        };

        for (s = 0; s < HEADERS.length; s++) {
            seen[HEADERS[s]] = 0;
        }

        status("Scanning " + docName(doc) + "...");

        try {
            oldRedraw = app.scriptPreferences.enableRedraw;
            app.scriptPreferences.enableRedraw = false;
        } catch (eRedraw) {}

        try {
            for (s = 0; s < doc.stories.length; s++) {
                story = doc.stories.item(s);
                if (!valid(story)) {
                    continue;
                }

                for (p = 0; p < story.paragraphs.length; p++) {
                    para = story.paragraphs.item(p);
                    if (!valid(para)) {
                        continue;
                    }

                    name = headerName(cleanText(safeContents(para)));
                    if (name !== null) {
                        seen[name]++;
                        rows.push(audit(para, name));
                    }
                }
            }

            for (s = 0; s < HEADERS.length; s++) {
                if (seen[HEADERS[s]] === 0) {
                    rows.push(missingRow(HEADERS[s]));
                    counts.missing++;
                }
            }

            sortRows();
            refresh(doc);
            status("Scan complete. Select a row and click Locate, or double-click it.");
        } catch (eScan) {
            status("Scan failed: " + eScan.message);
            alert("HeaderFix scan failed.\n\n" + eScan.message + "\nLine: " + errorLine(eScan));
        } finally {
            if (oldRedraw !== null) {
                try {
                    app.scriptPreferences.enableRedraw = oldRedraw;
                } catch (eRestore) {}
            }
        }
    }

    function audit(para, section) {
        var style = paragraphStyleName(para);
        var overrides = overrideState(para);
        var loc = locationOf(para);
        var row = {
            severity: "PASS",
            code: "",
            section: section,
            page: loc.page,
            pageSort: loc.pageSort,
            style: style,
            overrides: overrides.value,
            overrideMethod: overrides.method,
            storyId: loc.storyId,
            frameId: loc.frameId,
            paragraphIndex: loc.paragraphIndex,
            location: loc.text,
            finding: "Header uses H1 with no local overrides.",
            action: "Locate",
            paragraph: para,
            pageRef: loc.pageRef
        };

        counts.found++;
        if (overrides.method === "styleOverridden fallback") {
            counts.fallback++;
        }

        if (style !== STYLE_NAME) {
            row.severity = "ERROR";
            row.code = "H1-002";
            row.finding = "Section heading uses paragraph style " + style + "; expected H1.";
            counts.wrong++;
        } else if (overrides.value === true) {
            row.severity = "WARNING";
            row.code = "H1-003";
            row.finding = "H1 is applied, but local formatting overrides exist.";
            counts.override++;
        } else if (overrides.value === false) {
            counts.pass++;
        } else {
            row.severity = "WARNING";
            row.code = "H1-003";
            row.finding = "H1 is applied, but HeaderFix could not verify override state.";
            counts.unknown++;
        }

        return row;
    }

    function overrideState(para) {
        var value;

        // Adobe DOM primary method. false = do not count an applied character
        // style by itself as a paragraph-style override.
        try {
            value = para.textHasOverrides(StyleType.PARAGRAPH_STYLE_TYPE, false);
            return {value: value === true, method: "textHasOverrides"};
        } catch (ePrimary) {}

        // Read-only fallback for ExtendScript DOM variations.
        try {
            value = para.styleOverridden;
            return {value: value === true, method: "styleOverridden fallback"};
        } catch (eFallback) {}

        return {value: null, method: "unavailable"};
    }

    function locationOf(para) {
        var storyId = property(para.parentStory, "id", "-");
        var paragraphIndex = property(para, "index", "-");
        var frame = null;
        var page = null;
        var frames;
        var frameId = "-";
        var pageName = "Overset/No page";
        var pageSort = 999999998;

        try {
            frames = para.insertionPoints.item(0).parentTextFrames;
            if (frames && frames.length > 0) {
                frame = frames[0];
            }
        } catch (eInsertionFrame) {}

        if (frame === null) {
            try {
                frames = para.parentTextFrames;
                if (frames && frames.length > 0) {
                    frame = frames[0];
                }
            } catch (eParagraphFrame) {}
        }

        if (frame !== null && valid(frame)) {
            frameId = property(frame, "id", "-");
            try {
                page = frame.parentPage;
            } catch (ePage) {}
        }

        if (page !== null && valid(page)) {
            pageName = property(page, "name", "?");
            try {
                pageSort = Number(page.documentOffset);
            } catch (eOffset) {}
        }

        return {
            page: pageName,
            pageSort: pageSort,
            storyId: storyId,
            frameId: frameId,
            paragraphIndex: paragraphIndex,
            pageRef: page,
            text: "Page " + pageName + " | Story " + storyId + " | Frame " + frameId + " | Paragraph " + paragraphIndex
        };
    }

    function missingRow(section) {
        return {
            severity: "WARNING",
            code: "H1-001",
            section: section,
            page: "-",
            pageSort: 999999999,
            style: "-",
            overrides: null,
            overrideMethod: "-",
            storyId: "-",
            frameId: "-",
            paragraphIndex: "-",
            location: "Document",
            finding: "Required section heading was not found anywhere in the active document.",
            action: "None",
            paragraph: null,
            pageRef: null
        };
    }

    function buildUI() {
        var buttons;
        var button;

        ui.win = new Window("palette", "HeaderFix v" + VERSION);
        ui.win.orientation = "column";
        ui.win.alignChildren = ["fill", "top"];
        ui.win.margins = 12;
        ui.win.spacing = 8;

        ui.title = ui.win.add("statictext", undefined, "H1 Section Header Audit");
        try {
            ui.title.graphics.font = ScriptUI.newFont(ui.title.graphics.font.name, "BOLD", 15);
        } catch (eFont) {}

        ui.summary = ui.win.add("statictext", undefined, "", {multiline: true});
        ui.summary.preferredSize = [780, 64];

        ui.list = ui.win.add("listbox", undefined, [], {multiselect: false});
        ui.list.preferredSize = [780, 360];
        ui.list.onDoubleClick = locate;

        ui.status = ui.win.add("statictext", undefined, "");
        ui.status.preferredSize = [780, 32];

        buttons = ui.win.add("group");
        buttons.alignment = ["right", "top"];

        button = buttons.add("button", undefined, "Rescan");
        button.onClick = scan;

        button = buttons.add("button", undefined, "Locate");
        button.onClick = locate;

        button = buttons.add("button", undefined, "Save CSV");
        button.onClick = saveCSV;

        button = buttons.add("button", undefined, "Close");
        button.onClick = function () { ui.win.close(); };
    }

    function refresh(doc) {
        var i, row, line, detection;
        ui.list.removeAll();

        for (i = 0; i < rows.length; i++) {
            row = rows[i];
            line = fixed(row.severity, 8) + "  " +
                   fixed(row.page, 12) + "  " +
                   fixed(row.section, 12) + "  " +
                   fixed(row.style, 18) + "  " +
                   fixed(overrideText(row.overrides), 8) + "  " +
                   row.finding;
            ui.list.add("item", line);
        }

        detection = "Override check: Adobe textHasOverrides";
        if (counts.fallback > 0) {
            detection += "; styleOverridden fallback used " + counts.fallback + " time(s)";
        }

        ui.summary.text = docName(doc) + "\n" +
            "Headers found: " + counts.found +
            "    Correct H1: " + counts.pass +
            "    H1 with overrides: " + counts.override +
            "    Wrong style: " + counts.wrong +
            "    Missing section types: " + counts.missing +
            (counts.unknown > 0 ? "    Override unknown: " + counts.unknown : "") + "\n" +
            detection;

        try {
            ui.win.layout.layout(true);
        } catch (eLayout) {}
    }

    function locate() {
        var row, para, located = false;

        if (ui.list.selection === null) {
            alert("Select an audit row first.");
            return;
        }

        row = rows[ui.list.selection.index];
        if (!row || row.paragraph === null || !valid(row.paragraph)) {
            alert("This row has no paragraph to locate.");
            return;
        }

        para = row.paragraph;

        try {
            if (row.pageRef !== null && valid(row.pageRef)) {
                app.activeWindow.activePage = row.pageRef;
            }
        } catch (eActivePage) {}

        try {
            para.showText();
            located = true;
        } catch (eShow) {}

        try {
            app.select(para);
            located = true;
        } catch (eSelect) {
            try {
                app.select(para.insertionPoints.item(0));
                located = true;
            } catch (eInsertionSelect) {}
        }

        if (located) {
            status("Located " + row.section + " at " + row.location + ".");
        } else {
            alert("InDesign could not navigate to this paragraph.\n\n" + row.location);
        }
    }

    function saveCSV() {
        var doc = app.activeDocument;
        var name = baseName(doc) + "_HeaderFix_" + timestamp() + ".csv";
        var target = defaultFile(doc, name).saveDlg("Save HeaderFix CSV", "CSV:*.csv");
        var f, i, row;

        if (target === null) {
            return;
        }
        if (!/\.csv$/i.test(target.name)) {
            target = new File(target.fsName + ".csv");
        }

        f = new File(target.fsName);
        f.encoding = "UTF-8";
        f.lineFeed = "Windows";
        if (!f.open("w")) {
            alert("HeaderFix could not open the selected file for writing.");
            return;
        }

        f.writeln(csv([
            "Severity", "Code", "Section", "Page", "Applied Style",
            "Has Overrides", "Override Detection", "Story ID", "Frame ID",
            "Paragraph Index", "Location", "Finding", "Available Action"
        ]));

        for (i = 0; i < rows.length; i++) {
            row = rows[i];
            f.writeln(csv([
                row.severity, row.code, row.section, row.page, row.style,
                overrideText(row.overrides), row.overrideMethod, row.storyId,
                row.frameId, row.paragraphIndex, row.location, row.finding, row.action
            ]));
        }

        f.close();
        status("CSV saved: " + target.fsName);
        alert("HeaderFix CSV saved.\n\n" + target.fsName);
    }

    function sortRows() {
        var order = {};
        var i;
        for (i = 0; i < HEADERS.length; i++) {
            order[HEADERS[i]] = i;
        }
        rows.sort(function (a, b) {
            if (a.pageSort !== b.pageSort) {
                return a.pageSort - b.pageSort;
            }
            return order[a.section] - order[b.section];
        });
    }

    function cleanText(value) {
        var s = String(value).replace(/\u00A0/g, " ");
        s = s.replace(/[\r\n]+$/g, "");
        s = s.replace(/^[\t ]+/, "").replace(/[\t ]+$/, "");
        return s;
    }

    function headerName(text) {
        var i;
        for (i = 0; i < HEADERS.length; i++) {
            if (text === HEADERS[i]) {
                return HEADERS[i];
            }
        }
        return null;
    }

    function paragraphStyleName(para) {
        try {
            return String(para.appliedParagraphStyle.name);
        } catch (e) {
            return "<unknown>";
        }
    }

    function safeContents(para) {
        try { return para.contents; } catch (e) { return ""; }
    }

    function valid(obj) {
        try { return obj !== null && obj.isValid === true; } catch (e) { return false; }
    }

    function property(obj, name, fallback) {
        try { return String(obj[name]); } catch (e) { return fallback; }
    }

    function overrideText(value) {
        if (value === true) { return "Yes"; }
        if (value === false) { return "No"; }
        if (value === null) { return "Unknown"; }
        return String(value);
    }

    function fixed(value, width) {
        var s = String(value);
        while (s.length < width) { s += " "; }
        if (s.length > width) { s = s.substring(0, width - 3) + "..."; }
        return s;
    }

    function csv(values) {
        var out = [], i, s;
        for (i = 0; i < values.length; i++) {
            s = String(values[i]).replace(/"/g, "\"\"");
            out.push("\"" + s + "\"");
        }
        return out.join(",");
    }

    function defaultFile(doc, name) {
        var folder = Folder.desktop;
        try {
            if (doc.saved && doc.filePath && doc.filePath.exists) {
                folder = doc.filePath;
            }
        } catch (e) {}
        return new File(folder.fsName + "/" + name);
    }

    function docName(doc) {
        try { return String(doc.name); } catch (e) { return "Active document"; }
    }

    function baseName(doc) {
        return docName(doc).replace(/\.indd$/i, "").replace(/[\\\/:*?"<>|]/g, "_");
    }

    function timestamp() {
        var d = new Date();
        return d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) + "-" +
               two(d.getHours()) + two(d.getMinutes()) + two(d.getSeconds());
    }

    function two(n) { return n < 10 ? "0" + n : String(n); }

    function status(text) {
        ui.status.text = text;
        try { ui.win.update(); } catch (e) {}
    }

    function errorLine(err) {
        try { return err.line; } catch (e) { return "?"; }
    }
}());
