(function attachAdminDiagnosticsDto(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.XinlingAdminDiagnostics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAdminDiagnosticsDto() {
  const PRESENT = new Set(["yes", "no", "uncertain"]);
  const CONFIDENCE = new Set(["high", "medium", "low"]);
  const WIDTH = new Set(["thick", "medium", "thin", "uncertain"]);
  const RATIO = new Set(["large", "medium", "small", "uncertain"]);

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function first(source, names) {
    for (const name of names) {
      if (source[name] !== undefined && source[name] !== null) return source[name];
    }
    return undefined;
  }

  function present(value, field) {
    if (value === true || value === "true") return "yes";
    if (value === false || value === "false") return "no";
    if (PRESENT.has(value)) return value;
    if (["yes_emphasized_by_text", "yes_but_faint"].includes(value)) return "yes";
    if (value === "uncertain_due_to_overlap") return "uncertain";
    if (field === "roots" && value === "no_roots_but_ground_line") return "no";
    if (field === "groundLine" && value === "no_roots_but_ground_line") return "yes";
    if (field === "window" && value === "no_clear_window") return "no";
    return "uncertain";
  }

  function confidence(value) {
    return CONFIDENCE.has(value) ? value : "low";
  }

  function count(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }

  function factSnapshotFromPacket(analysisPacket) {
    const checks = object(object(analysisPacket).verification_checks);
    const smoke = object(checks.chimney_and_smoke);
    const trunk = object(checks.tree_trunk_width);
    const scars = object(checks.tree_scars_holes_damage);
    const roots = object(checks.roots_and_ground);
    const house = object(checks.house_openings);
    const hands = object(checks.person_hands_fingers);
    const face = object(checks.person_facial_features);
    const ratio = first(trunk, ["crown_to_trunk_ratio"]);
    return {
      chimney: { present: present(first(smoke, ["chimney_present", "present"]), "chimney"), confidence: confidence(first(smoke, ["chimney_confidence", "confidence"])) },
      smoke: { present: present(first(smoke, ["smoke_present"]), "smoke"), plumeCount: count(first(smoke, ["smoke_plume_count", "plume_count"])), confidence: confidence(first(smoke, ["smoke_confidence", "confidence"])) },
      treeTrunk: {
        absoluteWidth: WIDTH.has(first(trunk, ["absolute_trunk_width", "absolute_judgment"])) ? first(trunk, ["absolute_trunk_width", "absolute_judgment"]) : "uncertain",
        crownToTrunkRatio: RATIO.has(ratio) ? ratio : ratio === "balanced" ? "medium" : "uncertain",
        possibleCrownSizeBias: typeof trunk.possible_crown_size_bias === "boolean" ? trunk.possible_crown_size_bias : null,
        confidence: confidence(trunk.confidence),
      },
      treeScars: { present: present(scars.present, "treeScars"), count: count(scars.count), confidence: confidence(scars.confidence) },
      roots: {
        present: present(first(roots, ["roots_present"]) ?? roots.present, "roots"),
        confidence: confidence(first(roots, ["roots_confidence", "confidence"])),
      },
      groundLine: {
        present: present(first(roots, ["ground_line_present", "ground_present"]) ?? roots.present, "groundLine"),
        confidence: confidence(first(roots, ["ground_line_confidence", "confidence"])),
      },
      house: {
        doorPresent: present(first(house, ["door_present", "doors_present"]), "door"),
        windowCount: (() => {
          const explicitCount = first(house, ["window_count", "windows_count"]);
          if (explicitCount !== undefined) return count(explicitCount);
          return present(first(house, ["window_present", "windows_present"]), "window") === "no" ? 0 : null;
        })(),
        confidence: confidence(first(house, ["door_window_confidence", "confidence"])),
      },
      person: {
        handsPresent: present(first(hands, ["hands_present", "present"]), "hands"),
        facialFeaturesPresent: present(first(face, ["facial_features_present", "present"]), "facialFeatures"),
        handsConfidence: confidence(first(hands, ["hands_confidence", "confidence"])),
        facialFeaturesConfidence: confidence(first(face, ["facial_features_confidence", "confidence"])),
      },
    };
  }

  function normalizeImageMetadata(value) {
    const source = object(value);
    const width = Number(first(source, ["width"]));
    const height = Number(first(source, ["height"]));
    const byteLength = Number(first(source, ["byteLength", "byte_length", "bytes"]));
    return {
      width: Number.isInteger(width) && width > 0 ? width : null,
      height: Number.isInteger(height) && height > 0 ? height : null,
      mimeType: String(first(source, ["mimeType", "mime_type"]) || ""),
      byteLength: Number.isFinite(byteLength) && byteLength >= 0 ? byteLength : null,
    };
  }

  function confirmationList(snapshot) {
    const candidates = [
      ["chimney.present", snapshot.chimney.present, snapshot.chimney.confidence],
      ["smoke.present", snapshot.smoke.present, snapshot.smoke.confidence],
      ["treeTrunk.absoluteWidth", snapshot.treeTrunk.absoluteWidth, snapshot.treeTrunk.confidence],
      ["treeTrunk.crownToTrunkRatio", snapshot.treeTrunk.crownToTrunkRatio, snapshot.treeTrunk.confidence],
      ["treeScars.present", snapshot.treeScars.present, snapshot.treeScars.confidence],
      ["roots.present", snapshot.roots.present, snapshot.roots.confidence],
      ["groundLine.present", snapshot.groundLine.present, snapshot.groundLine.confidence],
      ["house.doorPresent", snapshot.house.doorPresent, snapshot.house.confidence],
      ["person.handsPresent", snapshot.person.handsPresent, snapshot.person.handsConfidence],
      ["person.facialFeaturesPresent", snapshot.person.facialFeaturesPresent, snapshot.person.facialFeaturesConfidence],
    ];
    return candidates.filter(([, value, level]) => value === "uncertain" || level === "low")
      .map(([fact, value, level]) => ({ fact, value, confidence: level }));
  }

  function normalizeAdminDiagnosticsPayload(payload) {
    const response = object(payload);
    const diagnostics = object(response.adminDiagnostics || response.admin_diagnostics);
    const modelSource = object(diagnostics.model);
    const imageSource = object(diagnostics.inputImage || diagnostics.input_image);
    const legacyImage = object(diagnostics.imageInput || diagnostics.image_input);
    const original = normalizeImageMetadata(imageSource.original || imageSource.original_image || legacyImage);
    const sent = normalizeImageMetadata(imageSource.sentToModel || imageSource.sent_to_model || legacyImage || original);
    const derivedSnapshot = factSnapshotFromPacket(response.analysisPacket || response.analysis_packet);
    const suppliedFacts = object(diagnostics.criticalVisualFacts || diagnostics.critical_visual_facts || response.factSnapshot || response.fact_snapshot);
    const criticalVisualFacts = Object.keys(suppliedFacts).length ? suppliedFacts : derivedSnapshot;
    const suppliedConfirmation = diagnostics.needsHumanConfirmation || diagnostics.needs_human_confirmation;
    const consistency = object(diagnostics.factConsistency || diagnostics.fact_consistency || object(response.diagnostics).factConsistency || object(response.diagnostics).fact_consistency);
    return {
      model: {
        analysisMode: String(first(modelSource, ["analysisMode", "analysis_mode"]) || response.mode || response.analysisMode || response.analysis_mode || ""),
        provider: String(modelSource.provider || response.provider || ""),
        model: String(modelSource.model || response.model || ""),
        promptVersion: String(first(modelSource, ["promptVersion", "prompt_version"]) || response.promptVersion || response.prompt_version || ""),
      },
      inputImage: {
        original,
        sentToModel: sent,
        preprocessOperations: Array.isArray(imageSource.preprocessOperations || imageSource.preprocess_operations)
          ? [...(imageSource.preprocessOperations || imageSource.preprocess_operations)]
          : [],
      },
      criticalVisualFacts,
      needsHumanConfirmation: Array.isArray(suppliedConfirmation) ? suppliedConfirmation : confirmationList(criticalVisualFacts),
      factConsistency: Object.keys(consistency).length ? consistency : { status: "not_checked", conflicts: [] },
    };
  }

  return { factSnapshotFromPacket, normalizeAdminDiagnosticsPayload, normalizePresence: present };
});
