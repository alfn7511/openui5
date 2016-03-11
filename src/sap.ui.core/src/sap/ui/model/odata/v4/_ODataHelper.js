/*!
 * ${copyright}
 */

sap.ui.define([
	"./lib/_Helper",
	"./lib/_Parser"
], function (_Helper, _Parser) {
	"use strict";

	var ODataHelper;

	ODataHelper = {
		/**
		 * Returns the map of binding-specific parameters from the given map. "Binding-specific"
		 * parameters are those with a key starting with '$$', i.e. OData query options provided as
		 * binding parameters are not contained in the map. The following parameters and parameter
		 * values are supported:
		 * <ul>
		 * <li> '$$groupId' with values undefined, '$auto' and '$direct'
		 * </ul>
		 *
		 * @param {object} mParameters
		 *   The map of binding parameters
		 * @returns {object}
		 *   The map of binding-specific parameters
		 * @throws {Error}
		 *   For unsupported parameters or parameter values
		 */
		buildBindingParameters : function (mParameters) {
			var mResult = {};

			if (mParameters) {
				Object.keys(mParameters).forEach(function (sKey) {
					if (sKey.indexOf("$$") !== 0) {
						return;
					}

					if (sKey !== "$$groupId") {
						throw new Error("Unsupported binding parameter: " + sKey);
					}

					if (mParameters[sKey] !== undefined && mParameters[sKey] !== "$direct"
						&& mParameters[sKey] !== "$auto") {
							throw new Error("Unsupported value '" + mParameters[sKey]
								+ "' for binding parameter '" + sKey + "'");
					}
					mResult[sKey] = mParameters[sKey];
				});
			}
			return mResult;
		},

		/**
		 * Constructs a map of query options from the given options <code>mOptions</code> and
		 * model options <code>mModelOptions</code>; an option overwrites a model option with the
		 * same key. Options in <code>mOptions</code> starting with '$$' indicate binding-specific
		 * parameters, which must not be part of a back end query; they are ignored and
		 * not added to the map.
		 * The following query options are disallowed:
		 * <ul>
		 * <li> System query options (key starts with "$") except those specified in
		 *   <code>aAllowed</code>
		 * <li> Parameter aliases (key starts with "@")
		 * <li> Custom query options starting with "sap-"
		 * </ul>
		 * @param {object} [mModelOptions={}]
		 *   Map of query options specified for the model
		 * @param {object} [mOptions={}]
		 *   Map of query options
		 * @param {string[]} [aAllowed=[]]
		 *   Names of allowed system query options
		 * @throws {Error} when disallowed OData query options are provided
		 * @returns {object}
		 *   The map of query options
		 */
		buildQueryOptions : function (mModelOptions, mOptions, aAllowed) {
			var mResult = JSON.parse(JSON.stringify(mModelOptions || {}));

			/**
			 * Validates an expand item.
			 *
			 * @param {boolean|object} vExpandOptions
			 *   The expand options (the value for the "$expand" in the hierarchical options);
			 *   either a map or simply true if there are no options
			 */
			function validateExpandItem(vExpandOptions) {
				var sOption;

				if (typeof vExpandOptions === "object") {
					for (sOption in vExpandOptions) {
						validateSystemQueryOption(sOption, vExpandOptions[sOption]);
					}
				}
			}

			/**
			 * Validates a system query option.
			 * @param {string} sOption The name of the option
			 * @param {any} vValue The value of the option
			 */
			function validateSystemQueryOption(sOption, vValue) {
				var sPath;

				if (!aAllowed || aAllowed.indexOf(sOption) < 0) {
					throw new Error("System query option " + sOption + " is not supported");
				}
				if (sOption === "$expand") {
					for (sPath in vValue) {
						validateExpandItem(vValue[sPath]);
					}
				}
			}

			if (mOptions) {
				Object.keys(mOptions).forEach(function (sKey) {
					var vValue = mOptions[sKey];

					if (sKey.indexOf("$$") === 0) {
						return;
					}

					if (sKey[0] === "@") {
						throw new Error("Parameter " + sKey + " is not supported");
					}
					if (sKey[0] === "$") {
						if ((sKey === "$expand" || sKey === "$select")
								&& typeof vValue === "string") {
							vValue = _Parser.parseSystemQueryOption(sKey + "=" + vValue)[sKey];
						}
						validateSystemQueryOption(sKey, vValue);
					} else if (sKey.indexOf("sap-") === 0) {
						throw new Error("Custom query option " + sKey + " is not supported");
					}
					mResult[sKey] = vValue;
				});
			}
			return mResult;
		},

		/**
		 * Returns the key predicate (see "4.3.1 Canonical URL") for the given entity type meta
		 * data and entity instance runtime data.
		 *
		 * @param {object} oEntityType
		 *   Entity type meta data
		 * @param {object} oEntityInstance
		 *   Entity instance runtime data
		 * @returns {string}
		 *   The key predicate, e.g. "(Sector='DevOps',ID='42')"
		 */
		getKeyPredicate : function (oEntityType, oEntityInstance) {
			var aKeyValuePairs = [];

			oEntityType.$Key.forEach(function (sName) {
				var sType = oEntityType[sName].$Type,
					sValue = _Helper.formatLiteral(oEntityInstance[sName], sType);

				aKeyValuePairs.push(
					encodeURIComponent(sName) + "=" + encodeURIComponent(sValue));
			});

			return "(" + aKeyValuePairs.join(",") + ")";
		}
	};

	return ODataHelper;
}, /* bExport= */ false);
