sap.ui.define(
  ["sap/fe/core/PageController", "sap/m/MessageBox", "sap/m/MessageToast"],
  function (PageController, MessageBox, MessageToast) {
    "use strict";

    // --- Global Data ---
    const globalData = {
      request_id: "",
      plant: "",
      base_unit_of_measure: "",
    };

    // --- Utility Functions ---
    function getRequestId() {
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      return urlParams.get("request_id");
    }

    function setInputValues(view, values) {
      Object.keys(values).forEach((id) => {
        if (view.byId(id)) {
          view.byId(id).setValue(values[id]);
        }
      });
    }

    function setActionParameters(oAction, params) {
      Object.keys(params).forEach((key) => {
        oAction.setParameter(key, params[key]);
      });
    }

    function getTodayISO() {
      return new Date().toISOString().slice(0, 10);
    }

    // --- SAP Quantity Update ---
    function updateSAPQuantity(oView) {
      const oModel = oView.getModel();
      const linkContext = `/overplus('${globalData.request_id}')/com.sap.gateway.srvd.zr_wm318_counting.v0001.sap_qty_side_effect(...)`;
      const oAction = oModel.bindContext(linkContext, null);

      const params = {
        special_stock_indicator: oView
          .byId("idSpecialStockIndicatorInput")
          .getValue(),
        stock_category: oView.byId("idStockCategoryInput").getValue(),
        batch_managed: oView.byId("idBatchInput").getEditable(),
        material: oView.byId("idItennrInput").getValue(),
        batch: oView.byId("idBatchInput").getValue(),
        plant: globalData.plant,
        storage_location: oView.byId("idLocationInput").getValue(),
        special_stock_number: oView
          .byId("idSpecialStockNumberInput")
          .getValue(),
      };

      setActionParameters(oAction, params);

      oAction
        .execute()
        .then(() => {
          const oResult = oAction.getBoundContext().getObject();
          setInputValues(oView, {
            idSAPQuantityInput: oResult.sap_quantity,
          });
        })
        .catch((err) => {
          console.error("Action failed:", err);
        });
    }

    // --- Save and Submit Action ---
    function saveAndSubmit(oView) {
      const oModel = oView.getModel();
      const linkContext = `/overplus('${globalData.request_id}')/com.sap.gateway.srvd.zr_wm318_counting.v0001.save_and_submit(...)`;
      const oAction = oModel.bindContext(linkContext, null);

      const params = {
        request_id: globalData.request_id,
        counted_quantity: oView.byId("idCountedQuantityInput").getValue(),
        itennr: oView.byId("idItennrInput").getValue(),
        description: oView.byId("idDescriptionInput").getValue(),
        batch: oView.byId("idBatchInput").getValue(),
        stock_category: oView.byId("idStockCategoryInput").getValue(),
        special_stock_ind: oView
          .byId("idSpecialStockIndicatorInput")
          .getValue() || "",
        special_stock_num: oView.byId("idSpecialStockNumberInput").getValue() || "",
        storage_type: oView.byId("idStorageTypeInput").getValue() || "",
        location: oView.byId("idLocationInput").getValue() || "",
        standard_cost: oView.byId("idStandardCostInput").getValue() || "",
        grn_date: getTodayISO(),
        sap_quantity: oView.byId("idSAPQuantityInput").getValue() || "",
        base_unit_of_measure: globalData.base_unit_of_measure,
      };

      setActionParameters(oAction, params);

      oAction
        .execute()
        .then(() => {
          const oResult = oAction.getBoundContext().getObject();
          if (oResult.error === true) {
            MessageBox.error(oResult.error_reason);
          } else {
            MessageToast.show("Save and Submitting...");

            // Go back to cockpit
            var Navigation = sap.ushell.Container.getService("Navigation");
            Navigation.historyBack(2);
          }
        })
        .catch((err) => {
          console.error("Action failed:", err);
        });
    }

    // --- Preload Data ---
    function preloadData(oView) {
      const oModel = oView.getModel();
      globalData.request_id = getRequestId();
      const requestId = globalData.request_id;
      const linkContext = `/overplus('${requestId}')/com.sap.gateway.srvd.zr_wm318_counting.v0001.preload_data(...)`;
      const oAction = oModel.bindContext(linkContext, null);

      oAction
        .execute()
        .then(() => {
          const oResult = oAction.getBoundContext().getObject();
          globalData.plant = oResult.plant;
          globalData.base_unit_of_measure = oResult.base_unit_of_measure;

          // Material input logic
          const itennrInput = oView.byId("idItennrInput");
          if (oResult.request_type === "A" || oResult.cycle_wise === "L") {
            itennrInput.setValue("");
            itennrInput.setEditable(true);
          } else {
            itennrInput.setValue(oResult.itennr);
            itennrInput.setEditable(false);
          }

          oView.byId("idBatchInput").setEditable(oResult.batch_needed);

          setInputValues(oView, {
            idLocationInput: oResult.location,
            idItennrInput: oResult.itennr,
            idHandingUnitInput: oResult.handing_unit,
            idCountedQuantityInput: oResult.counted_quantity,
            idBatchInput: oResult.batch,
            idStockCategoryInput: oResult.stock_category,
            idSpecialStockIndicatorInput: oResult.special_stock_ind,
            idSpecialStockNumberInput: oResult.special_stock_num,
            idSAPQuantityInput: oResult.sap_quantity,
            idStorageTypeInput: oResult.storage_type,
            idDescriptionInput: oResult.description,
            idMaterialTypeInput: oResult.material_type,
            idStandardCostInput: oResult.standard_cost,
            idDesignGroupInput: oResult.design_group,
          });

          oView
            .byId("idStockCategoryInput")
            .setEditable(!oResult.stock_category_needed);

          updateSAPQuantity(oView);
        })
        .catch((err) => {
          console.error("Action failed:", err);
        });
    }

    // --- Controller Definition ---
    return PageController.extend("cyclecountingimoverplus.ext.main.Main", {
      onInit: function () {
        PageController.prototype.onInit.apply(this, arguments);
      },

      onAfterRendering: function () {
        preloadData(this.getView());
        console.log(globalData);
      },

      onInputChange: function () {
        updateSAPQuantity(this.getView());
      },

      onSaveButtonPress: function () {
        if (this.getView().byId("idCountedQuantityInput").getValue() == null) {
          MessageBox.error("Counted Unit is mandatory!");
        }
        saveAndSubmit(this.getView());
      },
    });
  }
);
