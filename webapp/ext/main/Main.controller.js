sap.ui.define(
  [
    "sap/fe/core/PageController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  function (PageController, MessageBox, MessageToast, Filter, FilterOperator) {
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
      const linkContext = `/overplus/com.sap.gateway.srvd.zr_wm318_counting.v0001.sap_qty_side_effect(...)`;
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
    function saveAndSubmit(oView, bIsDirectAccess) {
      const oModel = oView.getModel();
      const linkContext = `/overplus/com.sap.gateway.srvd.zr_wm318_counting.v0001.save_and_submit(...)`;
      const oAction = oModel.bindContext(linkContext, null);

      const params = {
        request_id: globalData.request_id || "",
        counted_quantity: oView.byId("idCountedQuantityInput").getValue(),
        itennr: oView.byId("idItennrInput").getValue(),
        description: oView.byId("idDescriptionInput").getValue(),
        batch: oView.byId("idBatchInput").getValue(),
        stock_category: oView.byId("idStockCategoryInput").getValue(),
        special_stock_ind:
          oView.byId("idSpecialStockIndicatorInput").getValue() || "",
        special_stock_num:
          oView.byId("idSpecialStockNumberInput").getValue() || "",
        storage_type: oView.byId("idStorageTypeInput").getValue() || "",
        location: oView.byId("idLocationInput").getValue() || "",
        standard_cost: oView.byId("idStandardCostInput").getValue() || "",
        grn_date: getTodayISO(),
        sap_quantity: oView.byId("idSAPQuantityInput").getValue() || "",
        base_unit_of_measure: globalData.base_unit_of_measure,
        problem: oView.byId("idProblemVhComboBox").getSelectedKey() || "",
      };

      setActionParameters(oAction, params);

      oAction
        .execute()
        .then(async () => {
          const oResult = oAction.getBoundContext().getObject();
          if (oResult.error === true) {
            MessageBox.error(oResult.error_reason);
          } else {
            MessageToast.show("Save and Submitting...");

            // Go back to cockpit or shell home, depending on how the app is accessed
            // If direct access, go to shell home. If accessed via other app, go back to cockpit.
            const oCrossAppNavigator = await sap.ushell.Container.getServiceAsync(
              "Navigation",
            );
            if (bIsDirectAccess) {
              //
              oCrossAppNavigator.navigate({
                target: {
                  shellHash: "#", // "#" = Launchpad Home
                },
              });
            } else {
              oCrossAppNavigator.navigate({
                target: {
                  semanticObject: "ZWM101COCKPIT",
                  action: "display",
                }
              });
            } 

          }
        })
        .catch((err) => {
          console.error("Action failed:", err);
        });
    }

    // --- Preload Data ---
    function preloadData(oView) {
      return new Promise((resolve, reject) => {
        const oModel = oView.getModel();
        globalData.request_id = getRequestId();
        const requestId = globalData.request_id;
        const linkContext = `/overplus/com.sap.gateway.srvd.zr_wm318_counting.v0001.preload_data(...)`;
        const oAction = oModel.bindContext(linkContext, null);

        const params = { request_id: requestId || "" };
        setActionParameters(oAction, params);
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
            updateGRNDate(oView);
            filterProblemByPlant(oView, globalData.plant);

            resolve(oResult);
          })
          .catch((err) => {
            console.error("Action failed:", err);
            reject(err);
          });
      });
    }

    // --- SAP GRN Date Update ---
    function updateGRNDate(oView) {
      const oModel = oView.getModel();
      const linkContext = `/overplus/com.sap.gateway.srvd.zr_wm318_counting.v0001.grn_date_side_effect(...)`;
      const oAction = oModel.bindContext(linkContext, null);

      const params = {
        grn_date:
          oView
            .byId("idGRNDatePicker")
            .getDateValue()
            ?.toISOString()
            .slice(0, 10) || null,
        batch_managed: oView.byId("idBatchInput").getEditable(),
        material: oView.byId("idItennrInput").getValue(),
        batch: oView.byId("idBatchInput").getValue(),
        plant: globalData.plant,
      };

      setActionParameters(oAction, params);

      oAction
        .execute()
        .then(() => {
          const oResult = oAction.getBoundContext().getObject();
          setInputValues(oView, {
            idGRNDatePicker: oResult.grn_date,
          });
        })
        .catch((err) => {
          console.error("Action failed:", err);
        });
    }

    function filterProblemByPlant(oView, sPlant) {
      var oComboBox = oView.byId("idProblemVhComboBox");
      var oBinding = oComboBox.getBinding("items");

      if (oBinding) {
        var aFilters = [];
        if (sPlant) {
          aFilters.push(new Filter("Werks", FilterOperator.EQ, sPlant));
        }
        oBinding.filter(aFilters);
      }
    }

    // --- Controller Definition ---
    return PageController.extend("cyclecountingimoverplus.ext.main.Main", {
      onInit: function () {
        PageController.prototype.onInit.apply(this, arguments);
      },

      onAfterRendering: async function () {
        await preloadData(this.getView());

        this._checkBatchNeeded();

        const bIsDirectAccess = this._isDirectAccess();
        if (bIsDirectAccess) {
          this.getView().byId("idItennrInput").setEditable(true);
        }
      },

      onInputChange: function () {
        updateSAPQuantity(this.getView());
        updateGRNDate(this.getView());
      },

      onSaveButtonPress: function () {
        const bIsDirectAccess = this._isDirectAccess();
        if (this.getView().byId("idCountedQuantityInput").getValue() == null) {
          MessageBox.error("Counted Unit is mandatory!");
        }
        saveAndSubmit(this.getView(), bIsDirectAccess);
      },

      onButtonSaveWithoutSubmitPress: function () {
        const oModel = this.getView().getModel();
        const linkContext = `/overplus/com.sap.gateway.srvd.zr_wm318_counting.v0001.save_without_submit(...)`;
        const oAction = oModel.bindContext(linkContext, null);

        const params = {
          request_id: globalData.request_id || "",
          counted_quantity: this.getView()
            .byId("idCountedQuantityInput")
            .getValue(),
          itennr: this.getView().byId("idItennrInput").getValue(),
          description: this.getView().byId("idDescriptionInput").getValue(),
          batch: this.getView().byId("idBatchInput").getValue(),
          stock_category: this.getView()
            .byId("idStockCategoryInput")
            .getValue(),
          special_stock_ind:
            this.getView().byId("idSpecialStockIndicatorInput").getValue() ||
            "",
          special_stock_num:
            this.getView().byId("idSpecialStockNumberInput").getValue() || "",
          storage_type:
            this.getView().byId("idStorageTypeInput").getValue() || "",
          location: this.getView().byId("idLocationInput").getValue() || "",
          standard_cost:
            this.getView().byId("idStandardCostInput").getValue() || "",
          grn_date: getTodayISO(),
          sap_quantity:
            this.getView().byId("idSAPQuantityInput").getValue() || "",
          base_unit_of_measure: globalData.base_unit_of_measure,
          problem:
            this.getView().byId("idProblemVhComboBox").getSelectedKey() || "",
        };

        setActionParameters(oAction, params);

        oAction
          .execute()
          .then(() => {
            const oResult = oAction.getBoundContext().getObject();
            if (oResult.error === true) {
              MessageBox.error(oResult.error_reason);
            } else {
              MessageToast.show("Save without Submitting...");

              // Clear counted quantity, batch, special stock indicator, special stock number
              setInputValues(this.getView(), {
                idCountedQuantityInput: "",
                idBatchInput: "",
                idSpecialStockIndicatorInput: "",
                idSpecialStockNumberInput: "",
                idProblemVhComboBox: "",
              });

              // Set location to non-editable
              this.getView().byId("idLocationInput").setEditable(false);

              // Set material to non-editable
              this.getView().byId("idItennrInput").setEditable(false);
            }
          })
          .catch((err) => {
            console.error("Action failed:", err);
          });
      },

      onInputMaterialChange: function () {
        updateSAPQuantity(this.getView());
        updateGRNDate(this.getView());

        this._checkBatchNeeded();
      },

      _checkBatchNeeded: function () {
        const oView = this.getView();
        const oModel = oView.getModel();
        const linkContext = `/overplus/com.sap.gateway.srvd.zr_wm318_counting.v0001.check_batch(...)`;
        const oAction = oModel.bindContext(linkContext, null);

        const sMaterial = oView.byId("idItennrInput").getValue();
        setActionParameters(oAction, {
          material: sMaterial,
          material_desc: "",
          plant: globalData.plant,
          part_type: "",
        });
        oAction
          .execute()
          .then(() => {
            const oResult = oAction.getBoundContext().getObject();
            oView.byId("idBatchInput").setEditable(oResult.batch_needed);
          })
          .catch((err) => {
            console.error("Action failed:", err);
          });
      },

      _isDirectAccess: function () {
        // Check if the parameter "request_id" exists in the URL
        const sUrl = window.location.href;
        const bHasRequestId = sUrl.includes("request_id=");

        // If exists = access via other app
        // If not exists = direct access
        return !bHasRequestId;
      },
      
    });
  },
);
