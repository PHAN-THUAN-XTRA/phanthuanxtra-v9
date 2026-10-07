var cc = DataStudioApp.createCommunityConnector();

function getAuthType() {
  return cc.newAuthTypeResponse().setAuthType(cc.AuthType.NONE).build();
}

function isAdminUser() {
  return false;
}

function getConfig() {
  var config = cc.getConfig();
  config.newInfo()
    .setId("privacy")
    .setText("Aggregate-only PHAN THUẦN XTRA metrics. No customer PII is exported.");
  return config.build();
}

function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;
  fields.newDimension().setId("generated_at").setName("Generated at").setType(types.TEXT);
  [
    "cars_total","cars_available","cars_reserved","cars_sold","cars_hidden",
    "leads_total","leads_new","leads_contacted","leads_qualified","leads_won","leads_lost",
    "posts_published","posts_draft","customers_total","follow_ups_due"
  ].forEach(function(id) {
    fields.newMetric().setId(id).setName(id.replace(/_/g, " ")).setType(types.NUMBER);
  });
  return fields;
}

function getSchema() {
  return { schema: getFields().build() };
}

function getData(request) {
  var props = PropertiesService.getScriptProperties();
  var endpoint = props.getProperty("PTX_ANALYTICS_ENDPOINT") || "https://phanthuanxtra.com/api/analytics/summary";
  var token = props.getProperty("ANALYTICS_EXPORT_TOKEN");
  if (!token) throw new Error("ANALYTICS_EXPORT_TOKEN is not configured in Script Properties.");

  var response = UrlFetchApp.fetch(endpoint, {
    method: "get",
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error("PHAN THUẦN XTRA analytics endpoint returned HTTP " + response.getResponseCode());
  }
  var payload = JSON.parse(response.getContentText());
  var values = payload.stats || {};
  values.generated_at = payload.generated_at || "";

  var requestedIds = request.fields.map(function(field) { return field.name; });
  var requestedFields = getFields().forIds(requestedIds);
  return {
    schema: requestedFields.build(),
    rows: [{ values: requestedIds.map(function(id) { return values[id] == null ? 0 : values[id]; }) }]
  };
}
