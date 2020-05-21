function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"], {
  /***/
  "./$$_lazy_route_resource lazy recursive":
  /*!******************************************************!*\
    !*** ./$$_lazy_route_resource lazy namespace object ***!
    \******************************************************/

  /*! no static exports found */

  /***/
  function $$_lazy_route_resourceLazyRecursive(module, exports) {
    function webpackEmptyAsyncContext(req) {
      // Here Promise.resolve().then() is used instead of new Promise() to prevent
      // uncaught exception popping up in devtools
      return Promise.resolve().then(function () {
        var e = new Error("Cannot find module '" + req + "'");
        e.code = 'MODULE_NOT_FOUND';
        throw e;
      });
    }

    webpackEmptyAsyncContext.keys = function () {
      return [];
    };

    webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
    module.exports = webpackEmptyAsyncContext;
    webpackEmptyAsyncContext.id = "./$$_lazy_route_resource lazy recursive";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/account/account/account.component.html":
  /*!**********************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/account/account/account.component.html ***!
    \**********************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppAccountAccountAccountComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div id=\"account\">\n    <div class=\"banner\">\n        <h3>Account</h3>\n    </div>\n</div>\n\n<div class=\"wrapper\">\n    <h4>Corporation Information</h4>\n    <br>\n    <div class=\"row\">\n        <div class=\"col-3\">\n            <img src=\"https://placehold.it/250x200\" alt=\"\">\n        </div>\n        <div class=\"col\">\n            <form>\n                <label>Corporation Name\n                    <input type=\"text\">\n                </label>\n                <br>\n                <label>Plant Name\n                    <input type=\"text\">\n                </label>\n                <br>\n                <label>Industry Typex\n                    <input type=\"text\">\n                </label>\n                <br>\n                <label>NAICS Code\n                    <input type=\"text\">\n                </label>\n                <br>\n                <label>Other\n                    <input type=\"text\">\n                </label>\n            </form>\n        </div>\n    </div>\n    \n    \n    <br>\n    <h4>Portfolio</h4>\n\n    <div class=\"importExport\">\n        <button class=\"btn btn-secondary\">Import</button>\n        <button class=\"btn btn-secondary\">Export</button>\n    </div>\n\n    <table>\n        <tr>\n            <th>Facilities</th>\n            <th>Country</th>\n            <th>Business</th>\n            <th>Teir</th>\n            <th>Facility Size</th>\n            <th>Units</th>\n            <th>Division</th>\n            <th></th>\n        </tr>\n        <tr>\n            <td>Plant 1</td>\n            <td>Argentina</td>\n            <td>Intl Export</td>\n            <td>3</td>\n            <td>10,764</td>\n            <td>ft<span class=\"superscript\">2</span></td>\n            <td>International Operations</td>\n            <td></td>\n        </tr>\n        <tr>\n            <td>Plant 1</td>\n            <td>Argentina</td>\n            <td>Intl Export</td>\n            <td>3</td>\n            <td>10,764</td>\n            <td>ft<span class=\"superscript\">2</span></td>\n            <td>International Operations</td>\n            <td></td>\n        </tr>\n        <tr>\n            <td>Plant 1</td>\n            <td>Argentina</td>\n            <td>Intl Export</td>\n            <td>3</td>\n            <td>10,764</td>\n            <td>ft<span class=\"superscript\">2</span></td>\n            <td>International Operations</td>\n            <td></td>\n        </tr>\n    </table>\n</div>";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/account/facility/facility.component.html":
  /*!************************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/account/facility/facility.component.html ***!
    \************************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppAccountFacilityFacilityComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div id=\"facility\">\n    <div class=\"banner\">\n        <h3>Facility Information</h3>\n    </div>\n</div>\n\n<div class=\"wrapper\">\n<h4>Facilty Information</h4>\n<br>\n<div class=\"row\">\n    <div class=\"col-4\">\n        <img src=\"https://placehold.it/350x200\" alt=\"\">\n    </div>\n    <div class=\"col\">\n        <div class=\"row\">\n            <div class=\"col\">\n                <form>\n                    <label>Building / Area\n                        <input type=\"text\">\n                    </label>\n                    <br>\n                    <label>County\n                        <input type=\"text\">\n                    </label>\n                    <br>\n                    <label>State\n                        <input type=\"text\">\n                    </label>\n                    <br>\n                    <label>Address\n                        <input type=\"text\">\n                    </label>\n                </form>\n            </div>\n            <div class=\"col\">\n                <form>\n                    <label>Business Type\n                        <input type=\"text\">\n                    </label>\n                    <br>\n                    <label>Teir\n                        <input type=\"text\">\n                    </label>\n                    <br>\n                    <label>Size\n                        <input type=\"text\">\n                    </label>\n                    <br>\n                    <label>Units\n                        <input type=\"text\">\n                    </label>\n                    <br>\n                    <label>Division\n                        <input type=\"text\">\n                    </label>\n                </form>\n            </div>\n        </div>\n    </div>\n</div>\n\n\n<br>\n<h4>Operating Schedule</h4>\n</div>";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/app.component.html":
  /*!**************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/app.component.html ***!
    \**************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppAppComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<app-header></app-header>\n<app-sidebar></app-sidebar>\n\n<div class=\"content\" role=\"main\" [class.open]=\"open == true\">\n  <router-outlet></router-outlet>\n</div>\n\n<app-footer></app-footer>\n";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/dashboard/dashboard.component.html":
  /*!******************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/dashboard/dashboard.component.html ***!
    \******************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppDashboardDashboardComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = " <!-- Highlight Card -->\n<br><br><br><br><br>\n <div class=\"card highlight-card card-small\">\n      \n    <svg id=\"rocket\" alt=\"Rocket Ship\" xmlns=\"http://www.w3.org/2000/svg\" width=\"101.678\" height=\"101.678\" viewBox=\"0 0 101.678 101.678\">\n      <g id=\"Group_83\" data-name=\"Group 83\" transform=\"translate(-141 -696)\">\n        <circle id=\"Ellipse_8\" data-name=\"Ellipse 8\" cx=\"50.839\" cy=\"50.839\" r=\"50.839\" transform=\"translate(141 696)\" fill=\"#dd0031\"/>\n        <g id=\"Group_47\" data-name=\"Group 47\" transform=\"translate(165.185 720.185)\">\n          <path id=\"Path_33\" data-name=\"Path 33\" d=\"M3.4,42.615a3.084,3.084,0,0,0,3.553,3.553,21.419,21.419,0,0,0,12.215-6.107L9.511,30.4A21.419,21.419,0,0,0,3.4,42.615Z\" transform=\"translate(0.371 3.363)\" fill=\"#fff\"/>\n          <path id=\"Path_34\" data-name=\"Path 34\" d=\"M53.3,3.221A3.09,3.09,0,0,0,50.081,0,48.227,48.227,0,0,0,18.322,13.437c-6-1.666-14.991-1.221-18.322,7.218A33.892,33.892,0,0,1,9.439,25.1l-.333.666a3.013,3.013,0,0,0,.555,3.553L23.985,43.641a2.9,2.9,0,0,0,3.553.555l.666-.333A33.892,33.892,0,0,1,32.647,53.3c8.55-3.664,8.884-12.326,7.218-18.322A48.227,48.227,0,0,0,53.3,3.221ZM34.424,9.772a6.439,6.439,0,1,1,9.106,9.106,6.368,6.368,0,0,1-9.106,0A6.467,6.467,0,0,1,34.424,9.772Z\" transform=\"translate(0 0.005)\" fill=\"#fff\"/>\n        </g>\n      </g>\n    </svg>\n\n    <span>{{ title }} app is running!</span>\n\n  </div>";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/shared/footer/footer.component.html":
  /*!*******************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/shared/footer/footer.component.html ***!
    \*******************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppSharedFooterFooterComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div id=\"footer\" role=\"footer\">\n    <div>\n        <p><i class=\"fa fa-calendar\"></i> 5/18/20</p>\n        <p><i class=\"fa fa-cog\"></i> Settings</p>\n        <p><i class=\"fa fa-building-o\"></i> Facilities 0/0</p>\n        <p><i class=\"fa fa-key\"></i> Password</p>\n        <p>v0.0.1</p>\n    </div>\n</div>";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/shared/header/header.component.html":
  /*!*******************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/shared/header/header.component.html ***!
    \*******************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppSharedHeaderHeaderComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div role=\"header\">\n    <div class=\"row resetmargin\">\n        <div class=\"col-2\">\n            <h2>VERIFI</h2>\n        </div>\n        <div class=\"col\">\n            <div class=\"searchBar\">\n                <i class=\"fa fa-search\"></i>\n                <input type=\"text\" ng-model=\"searchBox\" placeholder=\"Search Verifi\">\n            </div>\n        </div>\n        <div class=\"col-2\">\n            <div class=\"facilityMenu\">\n                <div class=\"currentFacility\" (click)=\"toggleFacilityMenu()\">\n                    <i class=\"fa fa-fort-awesome\"></i>\n                    <span>General Motors</span>\n                    <p>Plant 1 <i class=\"fa fa-caret-down\"></i></p>\n                </div>\n                <div class=\"dropdown\" [class.open]=\"facilityMenu == true\">\n                    <p><i class=\"fa fa-fort-awesome\"></i> Plant 2</p>\n                    <p><i class=\"fa fa-fort-awesome\"></i> Plant 3</p>\n                    <hr>\n                    <p><i class=\"fa fa-plus\"></i> Add New Facility</p>\n                </div>\n            </div>\n        </div>\n        <div class=\"col-1\">\n            <div class=\"accountMenu\">\n                <i class=\"fa fa-ellipsis-v\" (click)=\"toggleAccountMenu()\"></i>\n                <div class=\"dropdown\" [class.open]=\"accountMenu == true\">\n                    <div class=\"currentAccount\">\n                        <img src=\"https://placehold.it/50x50\" alt=\"\">\n                        <p>General Motors</p>\n                    </div>\n                    <hr>\n                    <a routerLink=\"/account/facility\">Manage Facility</a>\n                    <br>\n                    <a routerLink=\"/account/account\">Manage Accounts</a>\n                    <p>Settings</p>\n                </div>\n            </div>\n        </div>\n    </div>\n</div>";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/shared/sidebar/sidebar.component.html":
  /*!*********************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/shared/sidebar/sidebar.component.html ***!
    \*********************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppSharedSidebarSidebarComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div class=\"sidebar\" role=\"sidebar\">\n    <div class=\"menuToggle\" (click)=\"toggleSidebar()\">\n        <i class=\"fa fa-align-left\" [hidden]=\"!open\"></i>\n        <i class=\"fa fa-align-right\" [hidden]=\"open\"></i>\n    </div>\n\n    <br>\n\n    <ul>\n        <li><a routerLink=\"/\" [routerLinkActive]=\"['active']\" [routerLinkActiveOptions]=\"{ exact: true }\"><i class=\"fa fa-home\"></i> <span>Home</span></a></li>\n        <li><a routerLink=\"utility/energy-consumtion\" [routerLinkActive]=\"['active']\"><i class=\"fa fa-bar-chart\"></i> <span>Utility Data</span></a></li>\n    </ul>\n\n    <br>\n\n    <div class=\"menuHeader\">\n        <p>Reports</p>\n        <hr style=\"height: 4px;\" [hidden]=\"open\">\n    </div>\n\n    <ul>\n        <li><i class=\"fa fa-th\"></i> <span>Overview</span></li>\n        <li><i class=\"fa fa-th\"></i> <span>Regression</span></li>\n        <li><i class=\"fa fa-th\"></i> <span>Scorecards</span></li>\n    </ul>\n    \n    <hr>\n    <ul>\n        <li><i class=\"fa fa-th\"></i> <span>Help</span></li>\n        <li><i class=\"fa fa-th\"></i> <span>About</span></li>\n        <li><i class=\"fa fa-th\"></i> <span>Feedback</span></li>\n        <li><i class=\"fa fa-th\"></i> <span>Acknoledgments</span></li>\n    </ul>\n</div>";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/data-table/data-table.component.html":
  /*!****************************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/utility/data-table/data-table.component.html ***!
    \****************************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppUtilityDataTableDataTableComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div class=\"wrapper\">\n    <p>data-table works!</p>\n</div>";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/electricity/electricity.component.html":
  /*!*************************************************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/electricity/electricity.component.html ***!
    \*************************************************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppUtilityEnergyConsumptionElectricityElectricityComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div class=\"row\">\n    <div class=\"col\">\n        <form>\n            <label>Building / Area\n                <input type=\"text\">\n            </label>\n            <br>\n            <label>County\n                <input type=\"text\">\n            </label>\n            <br>\n            <label>State\n                <input type=\"text\">\n            </label>\n            <br>\n            <label>Address\n                <input type=\"text\">\n            </label>\n        </form>\n    </div>\n    <div class=\"col\">\n        <form>\n            <label>Business Type\n                <input type=\"text\">\n            </label>\n            <br>\n            <label>Teir\n                <input type=\"text\">\n            </label>\n            <br>\n            <label>Size\n                <input type=\"text\">\n            </label>\n            <br>\n            <label>Units\n                <input type=\"text\">\n            </label>\n            <br>\n            <label>Division\n                <input type=\"text\">\n            </label>\n        </form>\n    </div>\n</div>\n\n<ul class=\"notes\">\n    <li><strong>Meter #</strong><br>13231</li>\n    <li><strong>Unit</strong><br><span class=\"select\">Kwh <i class=\"fa fa-chevron-down\"></i></span></li>\n    <li><strong>Notes</strong><br><span class=\"underline\">Location, day of month read, etc <i class=\"fa fa-pencil\"></i></span></li>\n</ul>\n\n<table>\n    <tr>\n        <th class=\"row-year\"></th>\n        <th class=\"row-subheader\"></th>\n        <th>Jan</th>\n        <th>Feb</th>\n        <th>March</th>\n        <th>April</th>\n        <th>May</th>\n        <th>June</th>\n        <th>July</th>\n        <th>Aug</th>\n        <th>Sept</th>\n        <th>Oct</th>\n        <th>Nov</th>\n        <th>Dec</th>\n    </tr>\n    <tr>\n        <th class=\"row-year\" rowspan=\"2\">2020</th>\n        <th class=\"row-subheader\">$$</th>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n    </tr>\n    <tr>\n        <th class=\"row-subheader\">Qty</th>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n    </tr>\n    <tr>\n        <th class=\"row-year\" rowspan=\"2\">2019</th>\n        <th class=\"row-subheader\">$$</th>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n    </tr>\n    <tr>\n        <th class=\"row-subheader\">Qty</th>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n    </tr>\n    <tr>\n        <th class=\"row-year\" rowspan=\"2\">2018</th>\n        <th class=\"row-subheader\">$$</th>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n    </tr>\n    <tr>\n        <th class=\"row-subheader\">Qty</th>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n        <td>0.00</td><td>0.00</td>\n    </tr>\n</table>\n\n<button class=\"btn btn-link\">Add New Meter</button>\n";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/energy-consumption.component.html":
  /*!********************************************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/energy-consumption.component.html ***!
    \********************************************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppUtilityEnergyConsumptionEnergyConsumptionComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div class=\"tabs\">\n    <ul>\n        <li><a routerLink=\"energy-source\" [routerLinkActive]=\"['active']\">Energy Source</a></li>\n        <li [hidden]=\"!energySource.value.electricity\"><a routerLink=\"electricity\" [routerLinkActive]=\"['active']\">Electricity</a></li>\n        <li [hidden]=\"!energySource.value.naturalGas\"><a routerLink=\"natural-gas\" [routerLinkActive]=\"['active']\">Natural Gas</a></li>\n\n        <li [hidden]=\"!energySource.value.lpg\"><a routerLink=\"lpg\" [routerLinkActive]=\"['active']\">LPG</a></li>\n        <li [hidden]=\"!energySource.value.fuelOil\"><a routerLink=\"fuel-oil\" [routerLinkActive]=\"['active']\">Fuel Oil</a></li>\n        <li [hidden]=\"!energySource.value.coal\"><a routerLink=\"coal\" [routerLinkActive]=\"['active']\">Coal</a></li>\n        <li [hidden]=\"!energySource.value.wood\"><a routerLink=\"wood\" [routerLinkActive]=\"['active']\">Wood</a></li>\n        <li [hidden]=\"!energySource.value.paper\"><a routerLink=\"paper\" [routerLinkActive]=\"['active']\">Paper</a></li>\n        <li [hidden]=\"!energySource.value.otherGas\"><a routerLink=\"other-gas\" [routerLinkActive]=\"['active']\">Other Gas</a></li>\n        <li [hidden]=\"!energySource.value.otherEnergy\"><a routerLink=\"other-elec\" [routerLinkActive]=\"['active']\">Other Energy</a></li>\n    </ul>\n</div>\n<div class=\"wrapper main-content\">\n    <router-outlet></router-outlet>\n</div>\n";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/energy-source/energy-source.component.html":
  /*!*****************************************************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/energy-source/energy-source.component.html ***!
    \*****************************************************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppUtilityEnergyConsumptionEnergySourceEnergySourceComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<h4>Energy Sources</h4>\n<p>Select all energy sources that <strong>Plant 1</strong> uses.</p>\n<br>\n<form [formGroup]=\"energySource\" (change)=\"formChange()\">\n    <label for=\"energySourceElec\">\n        <input id=\"energySourceElec\" type=\"checkbox\" formControlName=\"electricity\">Electricity\n    </label>\n    <label for=\"energySourceNG\">\n        <input id=\"energySourceNG\" type=\"checkbox\" formControlName=\"naturalGas\">Natural Gas\n    </label>\n    <label for=\"energySourceLPG\">\n        <input id=\"energySourceLPG\" type=\"checkbox\" formControlName=\"lpg\">LPG\n    </label>\n    <label for=\"energySourceFO\">\n        <input id=\"energySourceFO\" type=\"checkbox\" formControlName=\"fuelOil\">Fuel Oil\n    </label>\n    <label for=\"energySourceCoal\">\n        <input id=\"energySourceCoal\" type=\"checkbox\" formControlName=\"coal\">Coal\n    </label>\n    <label for=\"energySourceWood\">\n        <input id=\"energySourceWood\" type=\"checkbox\" formControlName=\"wood\">Wood\n    </label>\n    <label for=\"energySourcePaper\">\n        <input id=\"energySourcePaper\" type=\"checkbox\" formControlName=\"paper\">Paper\n    </label>\n    <label for=\"energySourceGas\">\n        <input id=\"energySourceGas\" type=\"checkbox\" formControlName=\"otherGas\">Other Gas\n    </label>\n    <label for=\"energySourceEnergy\">\n        <input id=\"energySourceEnergy\" type=\"checkbox\" formControlName=\"otherEnergy\">Other Energy\n    </label>\n</form>";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/help-panel/help-panel.component.html":
  /*!****************************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/utility/help-panel/help-panel.component.html ***!
    \****************************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppUtilityHelpPanelHelpPanelComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div class=\"wrapper help-panel tab-margin\">\n    <h4>Help</h4>\n    <p>help-panel works!</p>\n</div>\n\n";
    /***/
  },

  /***/
  "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/utility.component.html":
  /*!**************************************************************************************!*\
    !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/utility/utility.component.html ***!
    \**************************************************************************************/

  /*! exports provided: default */

  /***/
  function node_modulesRawLoaderDistCjsJsSrcAppUtilityUtilityComponentHtml(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "<div id=\"utility\">\n    <div class=\"banner\">\n        <h3>Utility Data</h3>\n        <div class=\"compNav\">\n            <ul>\n                <li><a routerLink=\"energy-consumtion\" [routerLinkActive]=\"['active']\">Energy Consumption</a></li>\n                <li><a routerLink=\"data-table\" [routerLinkActive]=\"['active']\">Data Table</a></li>\n                <li><a routerLink=\"energy-charts\" [routerLinkActive]=\"['active']\">Energy Charts</a></li>\n                <li><a routerLink=\"predictors\" [routerLinkActive]=\"['active']\">Predictors</a></li>\n                <li><a routerLink=\"predictor-charts\" [routerLinkActive]=\"['active']\">Predictor Charts</a></li>\n                <li><a routerLink=\"ep-charts\" [routerLinkActive]=\"['active']\">E vs P Charts</a></li>\n            </ul>\n        </div>\n    </div>\n</div>\n\n<div class=\"row\">\n    <div class=\"col\">\n        <router-outlet></router-outlet>\n    </div>\n    <div class=\"col-3\">\n        <app-help-panel></app-help-panel>\n    </div>\n</div>\n\n\n";
    /***/
  },

  /***/
  "./node_modules/tslib/tslib.es6.js":
  /*!*****************************************!*\
    !*** ./node_modules/tslib/tslib.es6.js ***!
    \*****************************************/

  /*! exports provided: __extends, __assign, __rest, __decorate, __param, __metadata, __awaiter, __generator, __createBinding, __exportStar, __values, __read, __spread, __spreadArrays, __await, __asyncGenerator, __asyncDelegator, __asyncValues, __makeTemplateObject, __importStar, __importDefault, __classPrivateFieldGet, __classPrivateFieldSet */

  /***/
  function node_modulesTslibTslibEs6Js(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__extends", function () {
      return __extends;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__assign", function () {
      return _assign;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__rest", function () {
      return __rest;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__decorate", function () {
      return __decorate;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__param", function () {
      return __param;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__metadata", function () {
      return __metadata;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__awaiter", function () {
      return __awaiter;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__generator", function () {
      return __generator;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__createBinding", function () {
      return __createBinding;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__exportStar", function () {
      return __exportStar;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__values", function () {
      return __values;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__read", function () {
      return __read;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__spread", function () {
      return __spread;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__spreadArrays", function () {
      return __spreadArrays;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__await", function () {
      return __await;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__asyncGenerator", function () {
      return __asyncGenerator;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__asyncDelegator", function () {
      return __asyncDelegator;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__asyncValues", function () {
      return __asyncValues;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__makeTemplateObject", function () {
      return __makeTemplateObject;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__importStar", function () {
      return __importStar;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__importDefault", function () {
      return __importDefault;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__classPrivateFieldGet", function () {
      return __classPrivateFieldGet;
    });
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "__classPrivateFieldSet", function () {
      return __classPrivateFieldSet;
    });
    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.
    
    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.
    
    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    /* global Reflect, Promise */


    var _extendStatics = function extendStatics(d, b) {
      _extendStatics = Object.setPrototypeOf || {
        __proto__: []
      } instanceof Array && function (d, b) {
        d.__proto__ = b;
      } || function (d, b) {
        for (var p in b) {
          if (b.hasOwnProperty(p)) d[p] = b[p];
        }
      };

      return _extendStatics(d, b);
    };

    function __extends(d, b) {
      _extendStatics(d, b);

      function __() {
        this.constructor = d;
      }

      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var _assign = function __assign() {
      _assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];

          for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
        }

        return t;
      };

      return _assign.apply(this, arguments);
    };

    function __rest(s, e) {
      var t = {};

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
      }

      if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
      }
      return t;
    }

    function __decorate(decorators, target, key, desc) {
      var c = arguments.length,
          r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
          d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) {
        if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      }
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    function __param(paramIndex, decorator) {
      return function (target, key) {
        decorator(target, key, paramIndex);
      };
    }

    function __metadata(metadataKey, metadataValue) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    }

    function __awaiter(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
          resolve(value);
        });
      }

      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }

        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }

        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    }

    function __generator(thisArg, body) {
      var _ = {
        label: 0,
        sent: function sent() {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: []
      },
          f,
          y,
          t,
          g;
      return g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
      }, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
        return this;
      }), g;

      function verb(n) {
        return function (v) {
          return step([n, v]);
        };
      }

      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");

        while (_) {
          try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];

            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;

              case 4:
                _.label++;
                return {
                  value: op[1],
                  done: false
                };

              case 5:
                _.label++;
                y = op[1];
                op = [0];
                continue;

              case 7:
                op = _.ops.pop();

                _.trys.pop();

                continue;

              default:
                if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                  _ = 0;
                  continue;
                }

                if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                  _.label = op[1];
                  break;
                }

                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }

                if (t && _.label < t[2]) {
                  _.label = t[2];

                  _.ops.push(op);

                  break;
                }

                if (t[2]) _.ops.pop();

                _.trys.pop();

                continue;
            }

            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y = 0;
          } finally {
            f = t = 0;
          }
        }

        if (op[0] & 5) throw op[1];
        return {
          value: op[0] ? op[1] : void 0,
          done: true
        };
      }
    }

    function __createBinding(o, m, k, k2) {
      if (k2 === undefined) k2 = k;
      o[k2] = m[k];
    }

    function __exportStar(m, exports) {
      for (var p in m) {
        if (p !== "default" && !exports.hasOwnProperty(p)) exports[p] = m[p];
      }
    }

    function __values(o) {
      var s = typeof Symbol === "function" && Symbol.iterator,
          m = s && o[s],
          i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number") return {
        next: function next() {
          if (o && i >= o.length) o = void 0;
          return {
            value: o && o[i++],
            done: !o
          };
        }
      };
      throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o),
          r,
          ar = [],
          e;

      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) {
          ar.push(r.value);
        }
      } catch (error) {
        e = {
          error: error
        };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }

      return ar;
    }

    function __spread() {
      for (var ar = [], i = 0; i < arguments.length; i++) {
        ar = ar.concat(__read(arguments[i]));
      }

      return ar;
    }

    function __spreadArrays() {
      for (var s = 0, i = 0, il = arguments.length; i < il; i++) {
        s += arguments[i].length;
      }

      for (var r = Array(s), k = 0, i = 0; i < il; i++) {
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) {
          r[k] = a[j];
        }
      }

      return r;
    }

    ;

    function __await(v) {
      return this instanceof __await ? (this.v = v, this) : new __await(v);
    }

    function __asyncGenerator(thisArg, _arguments, generator) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var g = generator.apply(thisArg, _arguments || []),
          i,
          q = [];
      return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () {
        return this;
      }, i;

      function verb(n) {
        if (g[n]) i[n] = function (v) {
          return new Promise(function (a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
      }

      function resume(n, v) {
        try {
          step(g[n](v));
        } catch (e) {
          settle(q[0][3], e);
        }
      }

      function step(r) {
        r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
      }

      function fulfill(value) {
        resume("next", value);
      }

      function reject(value) {
        resume("throw", value);
      }

      function settle(f, v) {
        if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
      }
    }

    function __asyncDelegator(o) {
      var i, p;
      return i = {}, verb("next"), verb("throw", function (e) {
        throw e;
      }), verb("return"), i[Symbol.iterator] = function () {
        return this;
      }, i;

      function verb(n, f) {
        i[n] = o[n] ? function (v) {
          return (p = !p) ? {
            value: __await(o[n](v)),
            done: n === "return"
          } : f ? f(v) : v;
        } : f;
      }
    }

    function __asyncValues(o) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var m = o[Symbol.asyncIterator],
          i;
      return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () {
        return this;
      }, i);

      function verb(n) {
        i[n] = o[n] && function (v) {
          return new Promise(function (resolve, reject) {
            v = o[n](v), settle(resolve, reject, v.done, v.value);
          });
        };
      }

      function settle(resolve, reject, d, v) {
        Promise.resolve(v).then(function (v) {
          resolve({
            value: v,
            done: d
          });
        }, reject);
      }
    }

    function __makeTemplateObject(cooked, raw) {
      if (Object.defineProperty) {
        Object.defineProperty(cooked, "raw", {
          value: raw
        });
      } else {
        cooked.raw = raw;
      }

      return cooked;
    }

    ;

    function __importStar(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) for (var k in mod) {
        if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
      }
      result["default"] = mod;
      return result;
    }

    function __importDefault(mod) {
      return mod && mod.__esModule ? mod : {
        "default": mod
      };
    }

    function __classPrivateFieldGet(receiver, privateMap) {
      if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
      }

      return privateMap.get(receiver);
    }

    function __classPrivateFieldSet(receiver, privateMap, value) {
      if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
      }

      privateMap.set(receiver, value);
      return value;
    }
    /***/

  },

  /***/
  "./src/app/account/account/account.component.css":
  /*!*******************************************************!*\
    !*** ./src/app/account/account/account.component.css ***!
    \*******************************************************/

  /*! exports provided: default */

  /***/
  function srcAppAccountAccountAccountComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "#account .banner {\n    background-color: #1e5ab3;\n}\n.importExport {\n    float: right;\n}\n.importExport button:first-child {\n    margin-right: 5px;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvYWNjb3VudC9hY2NvdW50L2FjY291bnQuY29tcG9uZW50LmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtJQUNJLHlCQUF5QjtBQUM3QjtBQUNBO0lBQ0ksWUFBWTtBQUNoQjtBQUNBO0lBQ0ksaUJBQWlCO0FBQ3JCIiwiZmlsZSI6InNyYy9hcHAvYWNjb3VudC9hY2NvdW50L2FjY291bnQuY29tcG9uZW50LmNzcyIsInNvdXJjZXNDb250ZW50IjpbIiNhY2NvdW50IC5iYW5uZXIge1xuICAgIGJhY2tncm91bmQtY29sb3I6ICMxZTVhYjM7XG59XG4uaW1wb3J0RXhwb3J0IHtcbiAgICBmbG9hdDogcmlnaHQ7XG59XG4uaW1wb3J0RXhwb3J0IGJ1dHRvbjpmaXJzdC1jaGlsZCB7XG4gICAgbWFyZ2luLXJpZ2h0OiA1cHg7XG59Il19 */";
    /***/
  },

  /***/
  "./src/app/account/account/account.component.ts":
  /*!******************************************************!*\
    !*** ./src/app/account/account/account.component.ts ***!
    \******************************************************/

  /*! exports provided: AccountComponent */

  /***/
  function srcAppAccountAccountAccountComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "AccountComponent", function () {
      return AccountComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var AccountComponent = /*#__PURE__*/function () {
      function AccountComponent() {
        _classCallCheck(this, AccountComponent);
      }

      _createClass(AccountComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return AccountComponent;
    }();

    AccountComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-account',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./account.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/account/account/account.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./account.component.css */
      "./src/app/account/account/account.component.css"))["default"]]
    })], AccountComponent);
    /***/
  },

  /***/
  "./src/app/account/facility/facility.component.css":
  /*!*********************************************************!*\
    !*** ./src/app/account/facility/facility.component.css ***!
    \*********************************************************/

  /*! exports provided: default */

  /***/
  function srcAppAccountFacilityFacilityComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "#facility .banner {\n    background-color: #6abb2e;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvYWNjb3VudC9mYWNpbGl0eS9mYWNpbGl0eS5jb21wb25lbnQuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0lBQ0kseUJBQXlCO0FBQzdCIiwiZmlsZSI6InNyYy9hcHAvYWNjb3VudC9mYWNpbGl0eS9mYWNpbGl0eS5jb21wb25lbnQuY3NzIiwic291cmNlc0NvbnRlbnQiOlsiI2ZhY2lsaXR5IC5iYW5uZXIge1xuICAgIGJhY2tncm91bmQtY29sb3I6ICM2YWJiMmU7XG59Il19 */";
    /***/
  },

  /***/
  "./src/app/account/facility/facility.component.ts":
  /*!********************************************************!*\
    !*** ./src/app/account/facility/facility.component.ts ***!
    \********************************************************/

  /*! exports provided: FacilityComponent */

  /***/
  function srcAppAccountFacilityFacilityComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "FacilityComponent", function () {
      return FacilityComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var FacilityComponent = /*#__PURE__*/function () {
      function FacilityComponent() {
        _classCallCheck(this, FacilityComponent);
      }

      _createClass(FacilityComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return FacilityComponent;
    }();

    FacilityComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-facility',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./facility.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/account/facility/facility.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./facility.component.css */
      "./src/app/account/facility/facility.component.css"))["default"]]
    })], FacilityComponent);
    /***/
  },

  /***/
  "./src/app/app-routing.module.ts":
  /*!***************************************!*\
    !*** ./src/app/app-routing.module.ts ***!
    \***************************************/

  /*! exports provided: AppRoutingModule */

  /***/
  function srcAppAppRoutingModuleTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "AppRoutingModule", function () {
      return AppRoutingModule;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/fesm2015/router.js");
    /* harmony import */


    var _account_account_account_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! ./account/account/account.component */
    "./src/app/account/account/account.component.ts");
    /* harmony import */


    var _account_facility_facility_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! ./account/facility/facility.component */
    "./src/app/account/facility/facility.component.ts");
    /* harmony import */


    var _utility_utility_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! ./utility/utility.component */
    "./src/app/utility/utility.component.ts");
    /* harmony import */


    var _utility_energy_consumption_energy_consumption_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! ./utility/energy-consumption/energy-consumption.component */
    "./src/app/utility/energy-consumption/energy-consumption.component.ts");
    /* harmony import */


    var _dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! ./dashboard/dashboard.component */
    "./src/app/dashboard/dashboard.component.ts");
    /* harmony import */


    var _utility_data_table_data_table_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! ./utility/data-table/data-table.component */
    "./src/app/utility/data-table/data-table.component.ts");
    /* harmony import */


    var _utility_energy_consumption_energy_source_energy_source_component__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! ./utility/energy-consumption/energy-source/energy-source.component */
    "./src/app/utility/energy-consumption/energy-source/energy-source.component.ts");
    /* harmony import */


    var _utility_energy_consumption_electricity_electricity_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! ./utility/energy-consumption/electricity/electricity.component */
    "./src/app/utility/energy-consumption/electricity/electricity.component.ts");

    var routes = [{
      path: '',
      component: _dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_7__["DashboardComponent"]
    }, {
      path: 'account/account',
      component: _account_account_account_component__WEBPACK_IMPORTED_MODULE_3__["AccountComponent"]
    }, {
      path: 'account/facility',
      component: _account_facility_facility_component__WEBPACK_IMPORTED_MODULE_4__["FacilityComponent"]
    }, {
      path: 'utility',
      component: _utility_utility_component__WEBPACK_IMPORTED_MODULE_5__["UtilityComponent"],
      children: [{
        path: '',
        children: [{
          path: 'energy-consumtion',
          component: _utility_energy_consumption_energy_consumption_component__WEBPACK_IMPORTED_MODULE_6__["EnergyConsumptionComponent"],
          children: [{
            path: 'energy-source',
            component: _utility_energy_consumption_energy_source_energy_source_component__WEBPACK_IMPORTED_MODULE_9__["EnergySourceComponent"]
          }, {
            path: 'electricity',
            component: _utility_energy_consumption_electricity_electricity_component__WEBPACK_IMPORTED_MODULE_10__["ElectricityComponent"]
          }]
        }, {
          path: 'data-table',
          component: _utility_data_table_data_table_component__WEBPACK_IMPORTED_MODULE_8__["DataTableComponent"]
        }]
      }]
    }];

    var AppRoutingModule = function AppRoutingModule() {
      _classCallCheck(this, AppRoutingModule);
    };

    AppRoutingModule = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["NgModule"])({
      imports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__["RouterModule"].forRoot(routes)],
      exports: [_angular_router__WEBPACK_IMPORTED_MODULE_2__["RouterModule"]]
    })], AppRoutingModule);
    /***/
  },

  /***/
  "./src/app/app.component.css":
  /*!***********************************!*\
    !*** ./src/app/app.component.css ***!
    \***********************************/

  /*! exports provided: default */

  /***/
  function srcAppAppComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzcmMvYXBwL2FwcC5jb21wb25lbnQuY3NzIn0= */";
    /***/
  },

  /***/
  "./src/app/app.component.ts":
  /*!**********************************!*\
    !*** ./src/app/app.component.ts ***!
    \**********************************/

  /*! exports provided: AppComponent */

  /***/
  function srcAppAppComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "AppComponent", function () {
      return AppComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var AppComponent = function AppComponent() {
      _classCallCheck(this, AppComponent);

      this.title = 'verifi';
    };

    AppComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-root',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./app.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/app.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./app.component.css */
      "./src/app/app.component.css"))["default"]]
    })], AppComponent);
    /***/
  },

  /***/
  "./src/app/app.module.ts":
  /*!*******************************!*\
    !*** ./src/app/app.module.ts ***!
    \*******************************/

  /*! exports provided: AppModule */

  /***/
  function srcAppAppModuleTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "AppModule", function () {
      return AppModule;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/platform-browser */
    "./node_modules/@angular/platform-browser/fesm2015/platform-browser.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/fesm2015/forms.js");
    /* harmony import */


    var _app_routing_module__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! ./app-routing.module */
    "./src/app/app-routing.module.ts");
    /* harmony import */


    var _app_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(
    /*! ./app.component */
    "./src/app/app.component.ts");
    /* harmony import */


    var _shared_header_header_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(
    /*! ./shared/header/header.component */
    "./src/app/shared/header/header.component.ts");
    /* harmony import */


    var _shared_footer_footer_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(
    /*! ./shared/footer/footer.component */
    "./src/app/shared/footer/footer.component.ts");
    /* harmony import */


    var _shared_sidebar_sidebar_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(
    /*! ./shared/sidebar/sidebar.component */
    "./src/app/shared/sidebar/sidebar.component.ts");
    /* harmony import */


    var _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(
    /*! @angular/platform-browser/animations */
    "./node_modules/@angular/platform-browser/fesm2015/animations.js");
    /* harmony import */


    var _account_account_account_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(
    /*! ./account/account/account.component */
    "./src/app/account/account/account.component.ts");
    /* harmony import */


    var _account_facility_facility_component__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(
    /*! ./account/facility/facility.component */
    "./src/app/account/facility/facility.component.ts");
    /* harmony import */


    var _utility_utility_component__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(
    /*! ./utility/utility.component */
    "./src/app/utility/utility.component.ts");
    /* harmony import */


    var _utility_energy_consumption_energy_consumption_component__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(
    /*! ./utility/energy-consumption/energy-consumption.component */
    "./src/app/utility/energy-consumption/energy-consumption.component.ts");
    /* harmony import */


    var _dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(
    /*! ./dashboard/dashboard.component */
    "./src/app/dashboard/dashboard.component.ts");
    /* harmony import */


    var _utility_data_table_data_table_component__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(
    /*! ./utility/data-table/data-table.component */
    "./src/app/utility/data-table/data-table.component.ts");
    /* harmony import */


    var _utility_energy_consumption_energy_source_energy_source_component__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(
    /*! ./utility/energy-consumption/energy-source/energy-source.component */
    "./src/app/utility/energy-consumption/energy-source/energy-source.component.ts");
    /* harmony import */


    var _utility_help_panel_help_panel_component__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(
    /*! ./utility/help-panel/help-panel.component */
    "./src/app/utility/help-panel/help-panel.component.ts");
    /* harmony import */


    var _utility_energy_consumption_electricity_electricity_component__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(
    /*! ./utility/energy-consumption/electricity/electricity.component */
    "./src/app/utility/energy-consumption/electricity/electricity.component.ts");

    var AppModule = function AppModule() {
      _classCallCheck(this, AppModule);
    };

    AppModule = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_2__["NgModule"])({
      declarations: [_app_component__WEBPACK_IMPORTED_MODULE_5__["AppComponent"], _shared_header_header_component__WEBPACK_IMPORTED_MODULE_6__["HeaderComponent"], _shared_footer_footer_component__WEBPACK_IMPORTED_MODULE_7__["FooterComponent"], _shared_sidebar_sidebar_component__WEBPACK_IMPORTED_MODULE_8__["SidebarComponent"], _account_account_account_component__WEBPACK_IMPORTED_MODULE_10__["AccountComponent"], _account_facility_facility_component__WEBPACK_IMPORTED_MODULE_11__["FacilityComponent"], _utility_utility_component__WEBPACK_IMPORTED_MODULE_12__["UtilityComponent"], _utility_energy_consumption_energy_consumption_component__WEBPACK_IMPORTED_MODULE_13__["EnergyConsumptionComponent"], _dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_14__["DashboardComponent"], _utility_data_table_data_table_component__WEBPACK_IMPORTED_MODULE_15__["DataTableComponent"], _utility_energy_consumption_energy_source_energy_source_component__WEBPACK_IMPORTED_MODULE_16__["EnergySourceComponent"], _utility_help_panel_help_panel_component__WEBPACK_IMPORTED_MODULE_17__["HelpPanelComponent"], _utility_energy_consumption_electricity_electricity_component__WEBPACK_IMPORTED_MODULE_18__["ElectricityComponent"]],
      imports: [_angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__["BrowserModule"], _app_routing_module__WEBPACK_IMPORTED_MODULE_4__["AppRoutingModule"], _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_9__["BrowserAnimationsModule"], _angular_forms__WEBPACK_IMPORTED_MODULE_3__["FormsModule"], _angular_forms__WEBPACK_IMPORTED_MODULE_3__["ReactiveFormsModule"]],
      providers: [],
      bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_5__["AppComponent"]]
    })], AppModule);
    /***/
  },

  /***/
  "./src/app/dashboard/dashboard.component.css":
  /*!***************************************************!*\
    !*** ./src/app/dashboard/dashboard.component.css ***!
    \***************************************************/

  /*! exports provided: default */

  /***/
  function srcAppDashboardDashboardComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "\n  svg.material-icons {\n    height: 24px;\n    width: auto;\n  }\n\n  svg.material-icons:not(:last-child) {\n    margin-right: 8px;\n  }\n\n  .card svg.material-icons path {\n    fill: #888;\n  }\n\n  .card-container {\n    display: flex;\n    flex-wrap: wrap;\n    justify-content: center;\n    margin-top: 16px;\n  }\n\n  .card {\n    border-radius: 4px;\n    border: 1px solid #eee;\n    background-color: #fafafa;\n    height: 40px;\n    width: 200px;\n    margin: 0 8px 16px;\n    padding: 16px;\n    display: flex;\n    flex-direction: row;\n    justify-content: center;\n    align-items: center;\n    transition: all 0.2s ease-in-out;\n    line-height: 24px;\n  }\n\n  .card-container .card:not(:last-child) {\n    margin-right: 0;\n  }\n\n  .card.card-small {\n    height: 16px;\n    width: 168px;\n  }\n\n  .card-container .card:not(.highlight-card) {\n    cursor: pointer;\n  }\n\n  .card-container .card:not(.highlight-card):hover {\n    transform: translateY(-3px);\n    box-shadow: 0 4px 17px rgba(black, 0.35);\n  }\n\n  .card-container .card:not(.highlight-card):hover .material-icons path {\n    fill: rgb(105, 103, 103);\n  }\n\n  .card.highlight-card {\n    background-color: #1976d2;\n    color: white;\n    font-weight: 600;\n    border: none;\n    width: auto;\n    width: 245px;\n    margin: 50px auto;\n    position: relative;\n  }\n\n  .card.card.highlight-card span {\n    margin-left: 60px;\n  }\n\n  svg#rocket {\n    width: 80px;\n    position: absolute;\n    left: -10px;\n    top: -30px;\n    z-index: 2;\n  }\n\n  svg#rocket-smoke {\n    height: 100vh;\n    position: absolute;\n    top: 10px;\n    right: 180px;\n    z-index: 1;\n  }\n\n  a,\n  a:visited,\n  a:hover {\n    color: #1976d2;\n    text-decoration: none;\n  }\n\n  a:hover {\n    color: #125699;\n  }\n\n  .terminal {\n    position: relative;\n    width: 80%;\n    max-width: 600px;\n    border-radius: 6px;\n    padding-top: 45px;\n    margin-top: 8px;\n    overflow: hidden;\n    background-color: rgb(15, 15, 16);\n  }\n\n  .terminal::before {\n    content: \"\\2022 \\2022 \\2022\";\n    position: absolute;\n    top: 0;\n    left: 0;\n    height: 4px;\n    background: rgb(58, 58, 58);\n    color: #c2c3c4;\n    width: 100%;\n    font-size: 2rem;\n    line-height: 0;\n    padding: 14px 0;\n    text-indent: 4px;\n  }\n\n  .terminal pre {\n    font-family: SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace;\n    color: white;\n    padding: 0 1rem 1rem;\n    margin: 0;\n  }\n\n  .circle-link {\n    height: 40px;\n    width: 40px;\n    border-radius: 40px;\n    margin: 8px;\n    background-color: white;\n    border: 1px solid #eeeeee;\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    cursor: pointer;\n    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);\n    transition: 1s ease-out;\n  }\n\n  .circle-link:hover {\n    transform: translateY(-0.25rem);\n    box-shadow: 0px 3px 15px rgba(0, 0, 0, 0.2);\n  }\n\n  footer {\n    margin-top: 8px;\n    display: flex;\n    align-items: center;\n    line-height: 20px;\n  }\n\n  footer a {\n    display: flex;\n    align-items: center;\n  }\n\n  .github-star-badge {\n    color: #24292e;\n    display: flex;\n    align-items: center;\n    font-size: 12px;\n    padding: 3px 10px;\n    border: 1px solid rgba(27,31,35,.2);\n    border-radius: 3px;\n    background-image: linear-gradient(-180deg,#fafbfc,#eff3f6 90%);\n    margin-left: 4px;\n    font-weight: 600;\n    font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol;\n  }\n\n  .github-star-badge:hover {\n    background-image: linear-gradient(-180deg,#f0f3f6,#e6ebf1 90%);\n    border-color: rgba(27,31,35,.35);\n    background-position: -.5em;\n  }\n\n  .github-star-badge .material-icons {\n    height: 16px;\n    width: 16px;\n    margin-right: 4px;\n  }\n\n  svg#clouds {\n    position: fixed;\n    bottom: -160px;\n    left: -230px;\n    z-index: -10;\n    width: 1920px;\n  }\n\n  /* Responsive Styles */\n\n  @media screen and (max-width: 767px) {\n\n    .card-container > *:not(.circle-link) ,\n    .terminal {\n      width: 100%;\n    }\n\n    .card:not(.highlight-card) {\n      height: 16px;\n      margin: 8px 0;\n    }\n\n    .card.highlight-card span {\n      margin-left: 72px;\n    }\n\n    svg#rocket-smoke {\n      right: 120px;\n      transform: rotate(-5deg);\n    }\n  }\n\n  @media screen and (max-width: 575px) {\n    svg#rocket-smoke {\n      display: none;\n      visibility: hidden;\n    }\n  }\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZGFzaGJvYXJkL2Rhc2hib2FyZC5jb21wb25lbnQuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7RUFDRTtJQUNFLFlBQVk7SUFDWixXQUFXO0VBQ2I7O0VBRUE7SUFDRSxpQkFBaUI7RUFDbkI7O0VBRUE7SUFDRSxVQUFVO0VBQ1o7O0VBRUE7SUFDRSxhQUFhO0lBQ2IsZUFBZTtJQUNmLHVCQUF1QjtJQUN2QixnQkFBZ0I7RUFDbEI7O0VBRUE7SUFDRSxrQkFBa0I7SUFDbEIsc0JBQXNCO0lBQ3RCLHlCQUF5QjtJQUN6QixZQUFZO0lBQ1osWUFBWTtJQUNaLGtCQUFrQjtJQUNsQixhQUFhO0lBQ2IsYUFBYTtJQUNiLG1CQUFtQjtJQUNuQix1QkFBdUI7SUFDdkIsbUJBQW1CO0lBQ25CLGdDQUFnQztJQUNoQyxpQkFBaUI7RUFDbkI7O0VBRUE7SUFDRSxlQUFlO0VBQ2pCOztFQUVBO0lBQ0UsWUFBWTtJQUNaLFlBQVk7RUFDZDs7RUFFQTtJQUNFLGVBQWU7RUFDakI7O0VBRUE7SUFDRSwyQkFBMkI7SUFDM0Isd0NBQXdDO0VBQzFDOztFQUVBO0lBQ0Usd0JBQXdCO0VBQzFCOztFQUVBO0lBQ0UseUJBQXlCO0lBQ3pCLFlBQVk7SUFDWixnQkFBZ0I7SUFDaEIsWUFBWTtJQUNaLFdBQVc7SUFDWCxZQUFZO0lBQ1osaUJBQWlCO0lBQ2pCLGtCQUFrQjtFQUNwQjs7RUFFQTtJQUNFLGlCQUFpQjtFQUNuQjs7RUFFQTtJQUNFLFdBQVc7SUFDWCxrQkFBa0I7SUFDbEIsV0FBVztJQUNYLFVBQVU7SUFDVixVQUFVO0VBQ1o7O0VBRUE7SUFDRSxhQUFhO0lBQ2Isa0JBQWtCO0lBQ2xCLFNBQVM7SUFDVCxZQUFZO0lBQ1osVUFBVTtFQUNaOztFQUVBOzs7SUFHRSxjQUFjO0lBQ2QscUJBQXFCO0VBQ3ZCOztFQUVBO0lBQ0UsY0FBYztFQUNoQjs7RUFFQTtJQUNFLGtCQUFrQjtJQUNsQixVQUFVO0lBQ1YsZ0JBQWdCO0lBQ2hCLGtCQUFrQjtJQUNsQixpQkFBaUI7SUFDakIsZUFBZTtJQUNmLGdCQUFnQjtJQUNoQixpQ0FBaUM7RUFDbkM7O0VBRUE7SUFDRSw0QkFBNEI7SUFDNUIsa0JBQWtCO0lBQ2xCLE1BQU07SUFDTixPQUFPO0lBQ1AsV0FBVztJQUNYLDJCQUEyQjtJQUMzQixjQUFjO0lBQ2QsV0FBVztJQUNYLGVBQWU7SUFDZixjQUFjO0lBQ2QsZUFBZTtJQUNmLGdCQUFnQjtFQUNsQjs7RUFFQTtJQUNFLG9FQUFvRTtJQUNwRSxZQUFZO0lBQ1osb0JBQW9CO0lBQ3BCLFNBQVM7RUFDWDs7RUFFQTtJQUNFLFlBQVk7SUFDWixXQUFXO0lBQ1gsbUJBQW1CO0lBQ25CLFdBQVc7SUFDWCx1QkFBdUI7SUFDdkIseUJBQXlCO0lBQ3pCLGFBQWE7SUFDYix1QkFBdUI7SUFDdkIsbUJBQW1CO0lBQ25CLGVBQWU7SUFDZix3RUFBd0U7SUFDeEUsdUJBQXVCO0VBQ3pCOztFQUVBO0lBQ0UsK0JBQStCO0lBQy9CLDJDQUEyQztFQUM3Qzs7RUFFQTtJQUNFLGVBQWU7SUFDZixhQUFhO0lBQ2IsbUJBQW1CO0lBQ25CLGlCQUFpQjtFQUNuQjs7RUFFQTtJQUNFLGFBQWE7SUFDYixtQkFBbUI7RUFDckI7O0VBRUE7SUFDRSxjQUFjO0lBQ2QsYUFBYTtJQUNiLG1CQUFtQjtJQUNuQixlQUFlO0lBQ2YsaUJBQWlCO0lBQ2pCLG1DQUFtQztJQUNuQyxrQkFBa0I7SUFDbEIsOERBQThEO0lBQzlELGdCQUFnQjtJQUNoQixnQkFBZ0I7SUFDaEIsa0lBQWtJO0VBQ3BJOztFQUVBO0lBQ0UsOERBQThEO0lBQzlELGdDQUFnQztJQUNoQywwQkFBMEI7RUFDNUI7O0VBRUE7SUFDRSxZQUFZO0lBQ1osV0FBVztJQUNYLGlCQUFpQjtFQUNuQjs7RUFFQTtJQUNFLGVBQWU7SUFDZixjQUFjO0lBQ2QsWUFBWTtJQUNaLFlBQVk7SUFDWixhQUFhO0VBQ2Y7O0VBR0Esc0JBQXNCOztFQUN0Qjs7SUFFRTs7TUFFRSxXQUFXO0lBQ2I7O0lBRUE7TUFDRSxZQUFZO01BQ1osYUFBYTtJQUNmOztJQUVBO01BQ0UsaUJBQWlCO0lBQ25COztJQUVBO01BQ0UsWUFBWTtNQUNaLHdCQUF3QjtJQUMxQjtFQUNGOztFQUVBO0lBQ0U7TUFDRSxhQUFhO01BQ2Isa0JBQWtCO0lBQ3BCO0VBQ0YiLCJmaWxlIjoic3JjL2FwcC9kYXNoYm9hcmQvZGFzaGJvYXJkLmNvbXBvbmVudC5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyJcbiAgc3ZnLm1hdGVyaWFsLWljb25zIHtcbiAgICBoZWlnaHQ6IDI0cHg7XG4gICAgd2lkdGg6IGF1dG87XG4gIH1cblxuICBzdmcubWF0ZXJpYWwtaWNvbnM6bm90KDpsYXN0LWNoaWxkKSB7XG4gICAgbWFyZ2luLXJpZ2h0OiA4cHg7XG4gIH1cblxuICAuY2FyZCBzdmcubWF0ZXJpYWwtaWNvbnMgcGF0aCB7XG4gICAgZmlsbDogIzg4ODtcbiAgfVxuXG4gIC5jYXJkLWNvbnRhaW5lciB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LXdyYXA6IHdyYXA7XG4gICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgbWFyZ2luLXRvcDogMTZweDtcbiAgfVxuXG4gIC5jYXJkIHtcbiAgICBib3JkZXItcmFkaXVzOiA0cHg7XG4gICAgYm9yZGVyOiAxcHggc29saWQgI2VlZTtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmFmYWZhO1xuICAgIGhlaWdodDogNDBweDtcbiAgICB3aWR0aDogMjAwcHg7XG4gICAgbWFyZ2luOiAwIDhweCAxNnB4O1xuICAgIHBhZGRpbmc6IDE2cHg7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LWRpcmVjdGlvbjogcm93O1xuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgdHJhbnNpdGlvbjogYWxsIDAuMnMgZWFzZS1pbi1vdXQ7XG4gICAgbGluZS1oZWlnaHQ6IDI0cHg7XG4gIH1cblxuICAuY2FyZC1jb250YWluZXIgLmNhcmQ6bm90KDpsYXN0LWNoaWxkKSB7XG4gICAgbWFyZ2luLXJpZ2h0OiAwO1xuICB9XG5cbiAgLmNhcmQuY2FyZC1zbWFsbCB7XG4gICAgaGVpZ2h0OiAxNnB4O1xuICAgIHdpZHRoOiAxNjhweDtcbiAgfVxuXG4gIC5jYXJkLWNvbnRhaW5lciAuY2FyZDpub3QoLmhpZ2hsaWdodC1jYXJkKSB7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICB9XG5cbiAgLmNhcmQtY29udGFpbmVyIC5jYXJkOm5vdCguaGlnaGxpZ2h0LWNhcmQpOmhvdmVyIHtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTNweCk7XG4gICAgYm94LXNoYWRvdzogMCA0cHggMTdweCByZ2JhKGJsYWNrLCAwLjM1KTtcbiAgfVxuXG4gIC5jYXJkLWNvbnRhaW5lciAuY2FyZDpub3QoLmhpZ2hsaWdodC1jYXJkKTpob3ZlciAubWF0ZXJpYWwtaWNvbnMgcGF0aCB7XG4gICAgZmlsbDogcmdiKDEwNSwgMTAzLCAxMDMpO1xuICB9XG5cbiAgLmNhcmQuaGlnaGxpZ2h0LWNhcmQge1xuICAgIGJhY2tncm91bmQtY29sb3I6ICMxOTc2ZDI7XG4gICAgY29sb3I6IHdoaXRlO1xuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XG4gICAgYm9yZGVyOiBub25lO1xuICAgIHdpZHRoOiBhdXRvO1xuICAgIHdpZHRoOiAyNDVweDtcbiAgICBtYXJnaW46IDUwcHggYXV0bztcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIH1cblxuICAuY2FyZC5jYXJkLmhpZ2hsaWdodC1jYXJkIHNwYW4ge1xuICAgIG1hcmdpbi1sZWZ0OiA2MHB4O1xuICB9XG5cbiAgc3ZnI3JvY2tldCB7XG4gICAgd2lkdGg6IDgwcHg7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIGxlZnQ6IC0xMHB4O1xuICAgIHRvcDogLTMwcHg7XG4gICAgei1pbmRleDogMjtcbiAgfVxuXG4gIHN2ZyNyb2NrZXQtc21va2Uge1xuICAgIGhlaWdodDogMTAwdmg7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogMTBweDtcbiAgICByaWdodDogMTgwcHg7XG4gICAgei1pbmRleDogMTtcbiAgfVxuXG4gIGEsXG4gIGE6dmlzaXRlZCxcbiAgYTpob3ZlciB7XG4gICAgY29sb3I6ICMxOTc2ZDI7XG4gICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICB9XG5cbiAgYTpob3ZlciB7XG4gICAgY29sb3I6ICMxMjU2OTk7XG4gIH1cblxuICAudGVybWluYWwge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICB3aWR0aDogODAlO1xuICAgIG1heC13aWR0aDogNjAwcHg7XG4gICAgYm9yZGVyLXJhZGl1czogNnB4O1xuICAgIHBhZGRpbmctdG9wOiA0NXB4O1xuICAgIG1hcmdpbi10b3A6IDhweDtcbiAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYigxNSwgMTUsIDE2KTtcbiAgfVxuXG4gIC50ZXJtaW5hbDo6YmVmb3JlIHtcbiAgICBjb250ZW50OiBcIlxcMjAyMiBcXDIwMjIgXFwyMDIyXCI7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIGhlaWdodDogNHB4O1xuICAgIGJhY2tncm91bmQ6IHJnYig1OCwgNTgsIDU4KTtcbiAgICBjb2xvcjogI2MyYzNjNDtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBmb250LXNpemU6IDJyZW07XG4gICAgbGluZS1oZWlnaHQ6IDA7XG4gICAgcGFkZGluZzogMTRweCAwO1xuICAgIHRleHQtaW5kZW50OiA0cHg7XG4gIH1cblxuICAudGVybWluYWwgcHJlIHtcbiAgICBmb250LWZhbWlseTogU0ZNb25vLVJlZ3VsYXIsQ29uc29sYXMsTGliZXJhdGlvbiBNb25vLE1lbmxvLG1vbm9zcGFjZTtcbiAgICBjb2xvcjogd2hpdGU7XG4gICAgcGFkZGluZzogMCAxcmVtIDFyZW07XG4gICAgbWFyZ2luOiAwO1xuICB9XG5cbiAgLmNpcmNsZS1saW5rIHtcbiAgICBoZWlnaHQ6IDQwcHg7XG4gICAgd2lkdGg6IDQwcHg7XG4gICAgYm9yZGVyLXJhZGl1czogNDBweDtcbiAgICBtYXJnaW46IDhweDtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTtcbiAgICBib3JkZXI6IDFweCBzb2xpZCAjZWVlZWVlO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgYm94LXNoYWRvdzogMCAxcHggM3B4IHJnYmEoMCwgMCwgMCwgMC4xMiksIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMjQpO1xuICAgIHRyYW5zaXRpb246IDFzIGVhc2Utb3V0O1xuICB9XG5cbiAgLmNpcmNsZS1saW5rOmhvdmVyIHtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTAuMjVyZW0pO1xuICAgIGJveC1zaGFkb3c6IDBweCAzcHggMTVweCByZ2JhKDAsIDAsIDAsIDAuMik7XG4gIH1cblxuICBmb290ZXIge1xuICAgIG1hcmdpbi10b3A6IDhweDtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgbGluZS1oZWlnaHQ6IDIwcHg7XG4gIH1cblxuICBmb290ZXIgYSB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICB9XG5cbiAgLmdpdGh1Yi1zdGFyLWJhZGdlIHtcbiAgICBjb2xvcjogIzI0MjkyZTtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgZm9udC1zaXplOiAxMnB4O1xuICAgIHBhZGRpbmc6IDNweCAxMHB4O1xuICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjcsMzEsMzUsLjIpO1xuICAgIGJvcmRlci1yYWRpdXM6IDNweDtcbiAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoLTE4MGRlZywjZmFmYmZjLCNlZmYzZjYgOTAlKTtcbiAgICBtYXJnaW4tbGVmdDogNHB4O1xuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XG4gICAgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sQmxpbmtNYWNTeXN0ZW1Gb250LFNlZ29lIFVJLEhlbHZldGljYSxBcmlhbCxzYW5zLXNlcmlmLEFwcGxlIENvbG9yIEVtb2ppLFNlZ29lIFVJIEVtb2ppLFNlZ29lIFVJIFN5bWJvbDtcbiAgfVxuXG4gIC5naXRodWItc3Rhci1iYWRnZTpob3ZlciB7XG4gICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KC0xODBkZWcsI2YwZjNmNiwjZTZlYmYxIDkwJSk7XG4gICAgYm9yZGVyLWNvbG9yOiByZ2JhKDI3LDMxLDM1LC4zNSk7XG4gICAgYmFja2dyb3VuZC1wb3NpdGlvbjogLS41ZW07XG4gIH1cblxuICAuZ2l0aHViLXN0YXItYmFkZ2UgLm1hdGVyaWFsLWljb25zIHtcbiAgICBoZWlnaHQ6IDE2cHg7XG4gICAgd2lkdGg6IDE2cHg7XG4gICAgbWFyZ2luLXJpZ2h0OiA0cHg7XG4gIH1cblxuICBzdmcjY2xvdWRzIHtcbiAgICBwb3NpdGlvbjogZml4ZWQ7XG4gICAgYm90dG9tOiAtMTYwcHg7XG4gICAgbGVmdDogLTIzMHB4O1xuICAgIHotaW5kZXg6IC0xMDtcbiAgICB3aWR0aDogMTkyMHB4O1xuICB9XG5cblxuICAvKiBSZXNwb25zaXZlIFN0eWxlcyAqL1xuICBAbWVkaWEgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA3NjdweCkge1xuXG4gICAgLmNhcmQtY29udGFpbmVyID4gKjpub3QoLmNpcmNsZS1saW5rKSAsXG4gICAgLnRlcm1pbmFsIHtcbiAgICAgIHdpZHRoOiAxMDAlO1xuICAgIH1cblxuICAgIC5jYXJkOm5vdCguaGlnaGxpZ2h0LWNhcmQpIHtcbiAgICAgIGhlaWdodDogMTZweDtcbiAgICAgIG1hcmdpbjogOHB4IDA7XG4gICAgfVxuXG4gICAgLmNhcmQuaGlnaGxpZ2h0LWNhcmQgc3BhbiB7XG4gICAgICBtYXJnaW4tbGVmdDogNzJweDtcbiAgICB9XG5cbiAgICBzdmcjcm9ja2V0LXNtb2tlIHtcbiAgICAgIHJpZ2h0OiAxMjBweDtcbiAgICAgIHRyYW5zZm9ybTogcm90YXRlKC01ZGVnKTtcbiAgICB9XG4gIH1cblxuICBAbWVkaWEgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA1NzVweCkge1xuICAgIHN2ZyNyb2NrZXQtc21va2Uge1xuICAgICAgZGlzcGxheTogbm9uZTtcbiAgICAgIHZpc2liaWxpdHk6IGhpZGRlbjtcbiAgICB9XG4gIH0iXX0= */";
    /***/
  },

  /***/
  "./src/app/dashboard/dashboard.component.ts":
  /*!**************************************************!*\
    !*** ./src/app/dashboard/dashboard.component.ts ***!
    \**************************************************/

  /*! exports provided: DashboardComponent */

  /***/
  function srcAppDashboardDashboardComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "DashboardComponent", function () {
      return DashboardComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var DashboardComponent = /*#__PURE__*/function () {
      function DashboardComponent(renderer) {
        _classCallCheck(this, DashboardComponent);

        this.renderer = renderer;
        this.title = 'verifi';
        this.renderer.addClass(document.body, 'open');
      }

      _createClass(DashboardComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return DashboardComponent;
    }();

    DashboardComponent.ctorParameters = function () {
      return [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Renderer2"]
      }];
    };

    DashboardComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-dashboard',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./dashboard.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/dashboard/dashboard.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./dashboard.component.css */
      "./src/app/dashboard/dashboard.component.css"))["default"]]
    })], DashboardComponent);
    /***/
  },

  /***/
  "./src/app/shared/footer/footer.component.css":
  /*!****************************************************!*\
    !*** ./src/app/shared/footer/footer.component.css ***!
    \****************************************************/

  /*! exports provided: default */

  /***/
  function srcAppSharedFooterFooterComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "div#footer {\n    position: fixed;\n    bottom: 0;\n    width: 100%;\n    background-color: white;\n    border-top: 2px solid #eee;\n}\n#footer div {\n    text-align:right;\n}\n#footer p {\n    display: inline-block;\n    padding: 6px 10px;\n    margin: 0;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvc2hhcmVkL2Zvb3Rlci9mb290ZXIuY29tcG9uZW50LmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtJQUNJLGVBQWU7SUFDZixTQUFTO0lBQ1QsV0FBVztJQUNYLHVCQUF1QjtJQUN2QiwwQkFBMEI7QUFDOUI7QUFDQTtJQUNJLGdCQUFnQjtBQUNwQjtBQUNBO0lBQ0kscUJBQXFCO0lBQ3JCLGlCQUFpQjtJQUNqQixTQUFTO0FBQ2IiLCJmaWxlIjoic3JjL2FwcC9zaGFyZWQvZm9vdGVyL2Zvb3Rlci5jb21wb25lbnQuY3NzIiwic291cmNlc0NvbnRlbnQiOlsiZGl2I2Zvb3RlciB7XG4gICAgcG9zaXRpb246IGZpeGVkO1xuICAgIGJvdHRvbTogMDtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTtcbiAgICBib3JkZXItdG9wOiAycHggc29saWQgI2VlZTtcbn1cbiNmb290ZXIgZGl2IHtcbiAgICB0ZXh0LWFsaWduOnJpZ2h0O1xufVxuI2Zvb3RlciBwIHtcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gICAgcGFkZGluZzogNnB4IDEwcHg7XG4gICAgbWFyZ2luOiAwO1xufSJdfQ== */";
    /***/
  },

  /***/
  "./src/app/shared/footer/footer.component.ts":
  /*!***************************************************!*\
    !*** ./src/app/shared/footer/footer.component.ts ***!
    \***************************************************/

  /*! exports provided: FooterComponent */

  /***/
  function srcAppSharedFooterFooterComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "FooterComponent", function () {
      return FooterComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var FooterComponent = /*#__PURE__*/function () {
      function FooterComponent() {
        _classCallCheck(this, FooterComponent);
      }

      _createClass(FooterComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return FooterComponent;
    }();

    FooterComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-footer',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./footer.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/shared/footer/footer.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./footer.component.css */
      "./src/app/shared/footer/footer.component.css"))["default"]]
    })], FooterComponent);
    /***/
  },

  /***/
  "./src/app/shared/header/header.component.css":
  /*!****************************************************!*\
    !*** ./src/app/shared/header/header.component.css ***!
    \****************************************************/

  /*! exports provided: default */

  /***/
  function srcAppSharedHeaderHeaderComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "div[role=\"header\"] {\n    width: 100%;\n    padding: 10px 0;\n    background-color: white;\n    border-bottom: 2px solid #eee;\n}\ndiv[role=\"header\"] h2 {\n    margin-bottom: 0px;\n    padding: 6px 10px 0 20px;\n    color: #545454;\n    font-size: 30px;\n}\n.searchBar input{\n    border-radius: 0 3px 3px 0;\n    margin-top: 8px;\n    width: calc(100% - 33px);\n    background-color: #eee;\n    border: none;\n    border-radius: 3px;\n    padding: 5px 10px;\n    outline: none;\n}\n.searchBar i {\n    float: left;\n    background-color: #eeeeee;\n    padding: 8px 0px 9px 10px;\n    margin-top: 8px;\n    border-radius: 3px 0 0 3px;\n    color: #7d7d7d;\n}\n.accountMenu {\n    text-align: right;\n}\n.accountMenu i {\n    font-size: 20px;\n    padding: 12px 20px;\n    cursor: pointer;\n}\n.dropdown {\n    position: absolute;\n    background-color: white;\n    padding: 20px;\n    min-width: 300px;\n    right: 0;\n    z-index: 100;\n    list-style: none;\n    text-align: left;\n    box-shadow: -3px 4px 8px #0000001c;\n    transform: scale(0);\n    transform-origin: top;\n    transition: all .1s ease-in-out;\n}\n.dropdown.open {\n    transform: scale(1);\n}\n.dropdown img {\n    float: left;\n}\n.currentAccount {\n    overflow: hidden;\n    padding: 10px 0 0 0;\n}\n.currentAccount p {\n    padding: 10px 0 0 64px;\n    font-size: 1.3em;\n}\n.facilityMenu .currentFacility > i {\n    font-size: 29px;\n    float: left;\n    padding: 8px;\n    color: #6abb2e;\n}\n.facilityMenu .dropdown {\n    min-width: 200px;\n    left: 0;\n}\n.facilityMenu p {\n    margin: 0px;\n}\n.currentFacility {\n    cursor: pointer;\n}\n.currentFacility p{\n    font-size: 20px;\n    font-weight: bold;\n    margin-top: -6px!important;\n}\n.dropdown p:hover {\n    color: #307100;\n    cursor: pointer;\n}\n@-webkit-keyframes openDropdown {\n    0% {\n        height: 0;\n        opacity: 0;\n    }\n    25% {\n        height: 25%;\n        opacity: 0;\n    }\n    50% {\n        height: 50%;\n        opacity: 0;\n    }\n    75% {\n        height: 75%;\n        opacity: 0;\n    }\n    100% {\n        opacity: 1;\n        height: 100%;\n    }\n}\n@keyframes openDropdown {\n    0% {\n        height: 0;\n        opacity: 0;\n    }\n    25% {\n        height: 25%;\n        opacity: 0;\n    }\n    50% {\n        height: 50%;\n        opacity: 0;\n    }\n    75% {\n        height: 75%;\n        opacity: 0;\n    }\n    100% {\n        opacity: 1;\n        height: 100%;\n    }\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvc2hhcmVkL2hlYWRlci9oZWFkZXIuY29tcG9uZW50LmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtJQUNJLFdBQVc7SUFDWCxlQUFlO0lBQ2YsdUJBQXVCO0lBQ3ZCLDZCQUE2QjtBQUNqQztBQUNBO0lBQ0ksa0JBQWtCO0lBQ2xCLHdCQUF3QjtJQUN4QixjQUFjO0lBQ2QsZUFBZTtBQUNuQjtBQUNBO0lBQ0ksMEJBQTBCO0lBQzFCLGVBQWU7SUFDZix3QkFBd0I7SUFDeEIsc0JBQXNCO0lBQ3RCLFlBQVk7SUFDWixrQkFBa0I7SUFDbEIsaUJBQWlCO0lBQ2pCLGFBQWE7QUFDakI7QUFDQTtJQUNJLFdBQVc7SUFDWCx5QkFBeUI7SUFDekIseUJBQXlCO0lBQ3pCLGVBQWU7SUFDZiwwQkFBMEI7SUFDMUIsY0FBYztBQUNsQjtBQUNBO0lBQ0ksaUJBQWlCO0FBQ3JCO0FBQ0E7SUFDSSxlQUFlO0lBQ2Ysa0JBQWtCO0lBQ2xCLGVBQWU7QUFDbkI7QUFDQTtJQUNJLGtCQUFrQjtJQUNsQix1QkFBdUI7SUFDdkIsYUFBYTtJQUNiLGdCQUFnQjtJQUNoQixRQUFRO0lBQ1IsWUFBWTtJQUNaLGdCQUFnQjtJQUNoQixnQkFBZ0I7SUFDaEIsa0NBQWtDO0lBQ2xDLG1CQUFtQjtJQUNuQixxQkFBcUI7SUFDckIsK0JBQStCO0FBQ25DO0FBQ0E7SUFDSSxtQkFBbUI7QUFDdkI7QUFDQTtJQUNJLFdBQVc7QUFDZjtBQUNBO0lBQ0ksZ0JBQWdCO0lBQ2hCLG1CQUFtQjtBQUN2QjtBQUNBO0lBQ0ksc0JBQXNCO0lBQ3RCLGdCQUFnQjtBQUNwQjtBQUNBO0lBQ0ksZUFBZTtJQUNmLFdBQVc7SUFDWCxZQUFZO0lBQ1osY0FBYztBQUNsQjtBQUNBO0lBQ0ksZ0JBQWdCO0lBQ2hCLE9BQU87QUFDWDtBQUNBO0lBQ0ksV0FBVztBQUNmO0FBQ0E7SUFDSSxlQUFlO0FBQ25CO0FBQ0E7SUFDSSxlQUFlO0lBQ2YsaUJBQWlCO0lBQ2pCLDBCQUEwQjtBQUM5QjtBQUNBO0lBQ0ksY0FBYztJQUNkLGVBQWU7QUFDbkI7QUFDQTtJQUNJO1FBQ0ksU0FBUztRQUNULFVBQVU7SUFDZDtJQUNBO1FBQ0ksV0FBVztRQUNYLFVBQVU7SUFDZDtJQUNBO1FBQ0ksV0FBVztRQUNYLFVBQVU7SUFDZDtJQUNBO1FBQ0ksV0FBVztRQUNYLFVBQVU7SUFDZDtJQUNBO1FBQ0ksVUFBVTtRQUNWLFlBQVk7SUFDaEI7QUFDSjtBQXJCQTtJQUNJO1FBQ0ksU0FBUztRQUNULFVBQVU7SUFDZDtJQUNBO1FBQ0ksV0FBVztRQUNYLFVBQVU7SUFDZDtJQUNBO1FBQ0ksV0FBVztRQUNYLFVBQVU7SUFDZDtJQUNBO1FBQ0ksV0FBVztRQUNYLFVBQVU7SUFDZDtJQUNBO1FBQ0ksVUFBVTtRQUNWLFlBQVk7SUFDaEI7QUFDSiIsImZpbGUiOiJzcmMvYXBwL3NoYXJlZC9oZWFkZXIvaGVhZGVyLmNvbXBvbmVudC5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyJkaXZbcm9sZT1cImhlYWRlclwiXSB7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgcGFkZGluZzogMTBweCAwO1xuICAgIGJhY2tncm91bmQtY29sb3I6IHdoaXRlO1xuICAgIGJvcmRlci1ib3R0b206IDJweCBzb2xpZCAjZWVlO1xufVxuZGl2W3JvbGU9XCJoZWFkZXJcIl0gaDIge1xuICAgIG1hcmdpbi1ib3R0b206IDBweDtcbiAgICBwYWRkaW5nOiA2cHggMTBweCAwIDIwcHg7XG4gICAgY29sb3I6ICM1NDU0NTQ7XG4gICAgZm9udC1zaXplOiAzMHB4O1xufVxuLnNlYXJjaEJhciBpbnB1dHtcbiAgICBib3JkZXItcmFkaXVzOiAwIDNweCAzcHggMDtcbiAgICBtYXJnaW4tdG9wOiA4cHg7XG4gICAgd2lkdGg6IGNhbGMoMTAwJSAtIDMzcHgpO1xuICAgIGJhY2tncm91bmQtY29sb3I6ICNlZWU7XG4gICAgYm9yZGVyOiBub25lO1xuICAgIGJvcmRlci1yYWRpdXM6IDNweDtcbiAgICBwYWRkaW5nOiA1cHggMTBweDtcbiAgICBvdXRsaW5lOiBub25lO1xufVxuLnNlYXJjaEJhciBpIHtcbiAgICBmbG9hdDogbGVmdDtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWVlZWVlO1xuICAgIHBhZGRpbmc6IDhweCAwcHggOXB4IDEwcHg7XG4gICAgbWFyZ2luLXRvcDogOHB4O1xuICAgIGJvcmRlci1yYWRpdXM6IDNweCAwIDAgM3B4O1xuICAgIGNvbG9yOiAjN2Q3ZDdkO1xufVxuLmFjY291bnRNZW51IHtcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcbn1cbi5hY2NvdW50TWVudSBpIHtcbiAgICBmb250LXNpemU6IDIwcHg7XG4gICAgcGFkZGluZzogMTJweCAyMHB4O1xuICAgIGN1cnNvcjogcG9pbnRlcjtcbn1cbi5kcm9wZG93biB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIGJhY2tncm91bmQtY29sb3I6IHdoaXRlO1xuICAgIHBhZGRpbmc6IDIwcHg7XG4gICAgbWluLXdpZHRoOiAzMDBweDtcbiAgICByaWdodDogMDtcbiAgICB6LWluZGV4OiAxMDA7XG4gICAgbGlzdC1zdHlsZTogbm9uZTtcbiAgICB0ZXh0LWFsaWduOiBsZWZ0O1xuICAgIGJveC1zaGFkb3c6IC0zcHggNHB4IDhweCAjMDAwMDAwMWM7XG4gICAgdHJhbnNmb3JtOiBzY2FsZSgwKTtcbiAgICB0cmFuc2Zvcm0tb3JpZ2luOiB0b3A7XG4gICAgdHJhbnNpdGlvbjogYWxsIC4xcyBlYXNlLWluLW91dDtcbn1cbi5kcm9wZG93bi5vcGVuIHtcbiAgICB0cmFuc2Zvcm06IHNjYWxlKDEpO1xufVxuLmRyb3Bkb3duIGltZyB7XG4gICAgZmxvYXQ6IGxlZnQ7XG59XG4uY3VycmVudEFjY291bnQge1xuICAgIG92ZXJmbG93OiBoaWRkZW47XG4gICAgcGFkZGluZzogMTBweCAwIDAgMDtcbn1cbi5jdXJyZW50QWNjb3VudCBwIHtcbiAgICBwYWRkaW5nOiAxMHB4IDAgMCA2NHB4O1xuICAgIGZvbnQtc2l6ZTogMS4zZW07XG59XG4uZmFjaWxpdHlNZW51IC5jdXJyZW50RmFjaWxpdHkgPiBpIHtcbiAgICBmb250LXNpemU6IDI5cHg7XG4gICAgZmxvYXQ6IGxlZnQ7XG4gICAgcGFkZGluZzogOHB4O1xuICAgIGNvbG9yOiAjNmFiYjJlO1xufVxuLmZhY2lsaXR5TWVudSAuZHJvcGRvd24ge1xuICAgIG1pbi13aWR0aDogMjAwcHg7XG4gICAgbGVmdDogMDtcbn1cbi5mYWNpbGl0eU1lbnUgcCB7XG4gICAgbWFyZ2luOiAwcHg7XG59XG4uY3VycmVudEZhY2lsaXR5IHtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG59XG4uY3VycmVudEZhY2lsaXR5IHB7XG4gICAgZm9udC1zaXplOiAyMHB4O1xuICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgIG1hcmdpbi10b3A6IC02cHghaW1wb3J0YW50O1xufVxuLmRyb3Bkb3duIHA6aG92ZXIge1xuICAgIGNvbG9yOiAjMzA3MTAwO1xuICAgIGN1cnNvcjogcG9pbnRlcjtcbn1cbkBrZXlmcmFtZXMgb3BlbkRyb3Bkb3duIHtcbiAgICAwJSB7XG4gICAgICAgIGhlaWdodDogMDtcbiAgICAgICAgb3BhY2l0eTogMDtcbiAgICB9XG4gICAgMjUlIHtcbiAgICAgICAgaGVpZ2h0OiAyNSU7XG4gICAgICAgIG9wYWNpdHk6IDA7XG4gICAgfVxuICAgIDUwJSB7XG4gICAgICAgIGhlaWdodDogNTAlO1xuICAgICAgICBvcGFjaXR5OiAwO1xuICAgIH1cbiAgICA3NSUge1xuICAgICAgICBoZWlnaHQ6IDc1JTtcbiAgICAgICAgb3BhY2l0eTogMDtcbiAgICB9XG4gICAgMTAwJSB7XG4gICAgICAgIG9wYWNpdHk6IDE7XG4gICAgICAgIGhlaWdodDogMTAwJTtcbiAgICB9XG59Il19 */";
    /***/
  },

  /***/
  "./src/app/shared/header/header.component.ts":
  /*!***************************************************!*\
    !*** ./src/app/shared/header/header.component.ts ***!
    \***************************************************/

  /*! exports provided: HeaderComponent */

  /***/
  function srcAppSharedHeaderHeaderComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "HeaderComponent", function () {
      return HeaderComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/fesm2015/router.js");

    var HeaderComponent = /*#__PURE__*/function () {
      function HeaderComponent(eRef, router) {
        var _this = this;

        _classCallCheck(this, HeaderComponent);

        this.eRef = eRef;
        this.router = router; // Close menus on navigation

        router.events.subscribe(function (event) {
          if (event instanceof _angular_router__WEBPACK_IMPORTED_MODULE_2__["NavigationStart"]) {
            _this.accountMenu = false;
            _this.facilityMenu = false;
          }
        });
      }

      _createClass(HeaderComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {
          this.accountMenu = false;
          this.facilityMenu = false;
        }
      }, {
        key: "toggleFacilityMenu",
        value: function toggleFacilityMenu() {
          this.facilityMenu = !this.facilityMenu;
          this.accountMenu = false;
        }
      }, {
        key: "toggleAccountMenu",
        value: function toggleAccountMenu() {
          this.accountMenu = !this.accountMenu;
          this.facilityMenu = false;
        } // close menus when user clicks outside the dropdown

      }, {
        key: "functionClick",
        value: function functionClick() {
          if (!this.eRef.nativeElement.contains(event.target)) {
            this.accountMenu = false;
            this.facilityMenu = false;
          }
        }
      }]);

      return HeaderComponent;
    }();

    HeaderComponent.ctorParameters = function () {
      return [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["ElementRef"]
      }, {
        type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]
      }];
    };

    HeaderComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-header',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./header.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/shared/header/header.component.html"))["default"],
      host: {
        '(document:click)': 'functionClick($event)'
      },
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./header.component.css */
      "./src/app/shared/header/header.component.css"))["default"]]
    })], HeaderComponent);
    /***/
  },

  /***/
  "./src/app/shared/sidebar/sidebar.component.css":
  /*!******************************************************!*\
    !*** ./src/app/shared/sidebar/sidebar.component.css ***!
    \******************************************************/

  /*! exports provided: default */

  /***/
  function srcAppSharedSidebarSidebarComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = ".sidebar {\n    padding: 30px 30px;\n    min-height: 100vh;\n    width: calc(120px - 50px);\n    position: fixed;\n    box-shadow: 2px 3px 5px 0px #77777759;\n    background-color: white;\n    transition: .2s width;\n}\n\n.sidebar  ul {\n    list-style: none;\n    margin: 0px;\n    padding: 0px;\n}\n\n.sidebar ul li {\n    padding: 7px 0;\n}\n\n.open .sidebar ul li {\n    min-width: 150px;\n}\n\n.menuHeader {\n    height: 22px;\n}\n\n.menuHeader hr{\n    margin: 0px;\n}\n\n.menuHeader p {\n    font-weight: bold;\n    text-transform: uppercase;\n}\n\n.active i {\n    color: #ff6000;\n}\n\ni.fa.fa-home {\n    font-size: 1.5em;\n    margin-left: -2px;\n}\n\n.menuToggle {\n    cursor: pointer;\n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvc2hhcmVkL3NpZGViYXIvc2lkZWJhci5jb21wb25lbnQuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0lBQ0ksa0JBQWtCO0lBQ2xCLGlCQUFpQjtJQUNqQix5QkFBeUI7SUFDekIsZUFBZTtJQUNmLHFDQUFxQztJQUNyQyx1QkFBdUI7SUFDdkIscUJBQXFCO0FBQ3pCOztBQUVBO0lBQ0ksZ0JBQWdCO0lBQ2hCLFdBQVc7SUFDWCxZQUFZO0FBQ2hCOztBQUNBO0lBQ0ksY0FBYztBQUNsQjs7QUFDQTtJQUNJLGdCQUFnQjtBQUNwQjs7QUFDQTtJQUNJLFlBQVk7QUFDaEI7O0FBQ0E7SUFDSSxXQUFXO0FBQ2Y7O0FBQ0E7SUFDSSxpQkFBaUI7SUFDakIseUJBQXlCO0FBQzdCOztBQUNBO0lBQ0ksY0FBYztBQUNsQjs7QUFDQTtJQUNJLGdCQUFnQjtJQUNoQixpQkFBaUI7QUFDckI7O0FBQ0E7SUFDSSxlQUFlO0FBQ25CIiwiZmlsZSI6InNyYy9hcHAvc2hhcmVkL3NpZGViYXIvc2lkZWJhci5jb21wb25lbnQuY3NzIiwic291cmNlc0NvbnRlbnQiOlsiLnNpZGViYXIge1xuICAgIHBhZGRpbmc6IDMwcHggMzBweDtcbiAgICBtaW4taGVpZ2h0OiAxMDB2aDtcbiAgICB3aWR0aDogY2FsYygxMjBweCAtIDUwcHgpO1xuICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICBib3gtc2hhZG93OiAycHggM3B4IDVweCAwcHggIzc3Nzc3NzU5O1xuICAgIGJhY2tncm91bmQtY29sb3I6IHdoaXRlO1xuICAgIHRyYW5zaXRpb246IC4ycyB3aWR0aDtcbn1cblxuLnNpZGViYXIgIHVsIHtcbiAgICBsaXN0LXN0eWxlOiBub25lO1xuICAgIG1hcmdpbjogMHB4O1xuICAgIHBhZGRpbmc6IDBweDtcbn1cbi5zaWRlYmFyIHVsIGxpIHtcbiAgICBwYWRkaW5nOiA3cHggMDtcbn1cbi5vcGVuIC5zaWRlYmFyIHVsIGxpIHtcbiAgICBtaW4td2lkdGg6IDE1MHB4O1xufVxuLm1lbnVIZWFkZXIge1xuICAgIGhlaWdodDogMjJweDtcbn1cbi5tZW51SGVhZGVyIGhye1xuICAgIG1hcmdpbjogMHB4O1xufVxuLm1lbnVIZWFkZXIgcCB7XG4gICAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbn1cbi5hY3RpdmUgaSB7XG4gICAgY29sb3I6ICNmZjYwMDA7XG59XG5pLmZhLmZhLWhvbWUge1xuICAgIGZvbnQtc2l6ZTogMS41ZW07XG4gICAgbWFyZ2luLWxlZnQ6IC0ycHg7XG59XG4ubWVudVRvZ2dsZSB7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xufVxuIl19 */";
    /***/
  },

  /***/
  "./src/app/shared/sidebar/sidebar.component.ts":
  /*!*****************************************************!*\
    !*** ./src/app/shared/sidebar/sidebar.component.ts ***!
    \*****************************************************/

  /*! exports provided: SidebarComponent */

  /***/
  function srcAppSharedSidebarSidebarComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "SidebarComponent", function () {
      return SidebarComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");
    /* harmony import */


    var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/router */
    "./node_modules/@angular/router/fesm2015/router.js");

    var SidebarComponent = /*#__PURE__*/function () {
      function SidebarComponent(renderer, eRef, router) {
        var _this2 = this;

        _classCallCheck(this, SidebarComponent);

        this.renderer = renderer;
        this.eRef = eRef;
        this.router = router;
        router.events.subscribe(function (event) {
          if (event instanceof _angular_router__WEBPACK_IMPORTED_MODULE_2__["NavigationEnd"]) {
            // Close sidebar on navigation
            _this2.open = true;

            _this2.toggleSidebar();
          } else if (router.url.toString() === "/") {
            // Keep sidebar open if its the homepage
            _this2.open = false;

            _this2.toggleSidebar();
          }
        });
      }

      _createClass(SidebarComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }, {
        key: "toggleSidebar",
        value: function toggleSidebar() {
          this.open = !this.open;
          var action = this.open ? 'addClass' : 'removeClass';
          this.renderer[action](document.body, 'open');

          if (action === "removeClass") {}
        }
      }]);

      return SidebarComponent;
    }();

    SidebarComponent.ctorParameters = function () {
      return [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Renderer2"]
      }, {
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["ElementRef"]
      }, {
        type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"]
      }];
    };

    SidebarComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-sidebar',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./sidebar.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/shared/sidebar/sidebar.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./sidebar.component.css */
      "./src/app/shared/sidebar/sidebar.component.css"))["default"]]
    })], SidebarComponent);
    /***/
  },

  /***/
  "./src/app/utility/data-table/data-table.component.css":
  /*!*************************************************************!*\
    !*** ./src/app/utility/data-table/data-table.component.css ***!
    \*************************************************************/

  /*! exports provided: default */

  /***/
  function srcAppUtilityDataTableDataTableComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzcmMvYXBwL3V0aWxpdHkvZGF0YS10YWJsZS9kYXRhLXRhYmxlLmNvbXBvbmVudC5jc3MifQ== */";
    /***/
  },

  /***/
  "./src/app/utility/data-table/data-table.component.ts":
  /*!************************************************************!*\
    !*** ./src/app/utility/data-table/data-table.component.ts ***!
    \************************************************************/

  /*! exports provided: DataTableComponent */

  /***/
  function srcAppUtilityDataTableDataTableComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "DataTableComponent", function () {
      return DataTableComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var DataTableComponent = /*#__PURE__*/function () {
      function DataTableComponent() {
        _classCallCheck(this, DataTableComponent);
      }

      _createClass(DataTableComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return DataTableComponent;
    }();

    DataTableComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-data-table',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./data-table.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/data-table/data-table.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./data-table.component.css */
      "./src/app/utility/data-table/data-table.component.css"))["default"]]
    })], DataTableComponent);
    /***/
  },

  /***/
  "./src/app/utility/energy-consumption/electricity/electricity.component.css":
  /*!**********************************************************************************!*\
    !*** ./src/app/utility/energy-consumption/electricity/electricity.component.css ***!
    \**********************************************************************************/

  /*! exports provided: default */

  /***/
  function srcAppUtilityEnergyConsumptionElectricityElectricityComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = ".notes i {\n\tfont-size: 12px;\n\tpadding: 4px 0px 0px 7px;\n\tcolor: #aaa;\n\tfloat: right;\n}\nul.notes li:nth-child(3) {\n\twidth: 610px;\n\tdisplay: block;\n}\nul span.underline {\n\tborder-bottom:1px solid #ddd;\n\tpadding: 4px 0px;\n\tborder-radius: 3px;\n\twidth: 100%;\n\tdisplay: block;\n}\nul.notes {\n\tpadding: 10px 0px;\n}\nul span.select {\n\tbackground-color: #eee;\n\tpadding: 2px 8px;\n\tborder-radius: 3px;\n\twidth: 100%;\n\tdisplay: block;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvdXRpbGl0eS9lbmVyZ3ktY29uc3VtcHRpb24vZWxlY3RyaWNpdHkvZWxlY3RyaWNpdHkuY29tcG9uZW50LmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtDQUNDLGVBQWU7Q0FDZix3QkFBd0I7Q0FDeEIsV0FBVztDQUNYLFlBQVk7QUFDYjtBQUNBO0NBQ0MsWUFBWTtDQUNaLGNBQWM7QUFDZjtBQUNBO0NBQ0MsNEJBQTRCO0NBQzVCLGdCQUFnQjtDQUNoQixrQkFBa0I7Q0FDbEIsV0FBVztDQUNYLGNBQWM7QUFDZjtBQUNBO0NBQ0MsaUJBQWlCO0FBQ2xCO0FBQ0E7Q0FDQyxzQkFBc0I7Q0FDdEIsZ0JBQWdCO0NBQ2hCLGtCQUFrQjtDQUNsQixXQUFXO0NBQ1gsY0FBYztBQUNmIiwiZmlsZSI6InNyYy9hcHAvdXRpbGl0eS9lbmVyZ3ktY29uc3VtcHRpb24vZWxlY3RyaWNpdHkvZWxlY3RyaWNpdHkuY29tcG9uZW50LmNzcyIsInNvdXJjZXNDb250ZW50IjpbIi5ub3RlcyBpIHtcblx0Zm9udC1zaXplOiAxMnB4O1xuXHRwYWRkaW5nOiA0cHggMHB4IDBweCA3cHg7XG5cdGNvbG9yOiAjYWFhO1xuXHRmbG9hdDogcmlnaHQ7XG59XG51bC5ub3RlcyBsaTpudGgtY2hpbGQoMykge1xuXHR3aWR0aDogNjEwcHg7XG5cdGRpc3BsYXk6IGJsb2NrO1xufVxudWwgc3Bhbi51bmRlcmxpbmUge1xuXHRib3JkZXItYm90dG9tOjFweCBzb2xpZCAjZGRkO1xuXHRwYWRkaW5nOiA0cHggMHB4O1xuXHRib3JkZXItcmFkaXVzOiAzcHg7XG5cdHdpZHRoOiAxMDAlO1xuXHRkaXNwbGF5OiBibG9jaztcbn1cbnVsLm5vdGVzIHtcblx0cGFkZGluZzogMTBweCAwcHg7XG59XG51bCBzcGFuLnNlbGVjdCB7XG5cdGJhY2tncm91bmQtY29sb3I6ICNlZWU7XG5cdHBhZGRpbmc6IDJweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDNweDtcblx0d2lkdGg6IDEwMCU7XG5cdGRpc3BsYXk6IGJsb2NrO1xufSJdfQ== */";
    /***/
  },

  /***/
  "./src/app/utility/energy-consumption/electricity/electricity.component.ts":
  /*!*********************************************************************************!*\
    !*** ./src/app/utility/energy-consumption/electricity/electricity.component.ts ***!
    \*********************************************************************************/

  /*! exports provided: ElectricityComponent */

  /***/
  function srcAppUtilityEnergyConsumptionElectricityElectricityComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "ElectricityComponent", function () {
      return ElectricityComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var ElectricityComponent = /*#__PURE__*/function () {
      function ElectricityComponent() {
        _classCallCheck(this, ElectricityComponent);
      }

      _createClass(ElectricityComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return ElectricityComponent;
    }();

    ElectricityComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-electricity',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./electricity.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/electricity/electricity.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./electricity.component.css */
      "./src/app/utility/energy-consumption/electricity/electricity.component.css"))["default"]]
    })], ElectricityComponent);
    /***/
  },

  /***/
  "./src/app/utility/energy-consumption/energy-consumption.component.css":
  /*!*****************************************************************************!*\
    !*** ./src/app/utility/energy-consumption/energy-consumption.component.css ***!
    \*****************************************************************************/

  /*! exports provided: default */

  /***/
  function srcAppUtilityEnergyConsumptionEnergyConsumptionComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzcmMvYXBwL3V0aWxpdHkvZW5lcmd5LWNvbnN1bXB0aW9uL2VuZXJneS1jb25zdW1wdGlvbi5jb21wb25lbnQuY3NzIn0= */";
    /***/
  },

  /***/
  "./src/app/utility/energy-consumption/energy-consumption.component.ts":
  /*!****************************************************************************!*\
    !*** ./src/app/utility/energy-consumption/energy-consumption.component.ts ***!
    \****************************************************************************/

  /*! exports provided: EnergyConsumptionComponent */

  /***/
  function srcAppUtilityEnergyConsumptionEnergyConsumptionComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "EnergyConsumptionComponent", function () {
      return EnergyConsumptionComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");
    /* harmony import */


    var _energy_consumption_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! ./energy-consumption.service */
    "./src/app/utility/energy-consumption/energy-consumption.service.ts");

    var EnergyConsumptionComponent = /*#__PURE__*/function () {
      function EnergyConsumptionComponent(service) {
        _classCallCheck(this, EnergyConsumptionComponent);

        this.service = service;
        this.energySource = this.service.energySource;
      }

      _createClass(EnergyConsumptionComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return EnergyConsumptionComponent;
    }();

    EnergyConsumptionComponent.ctorParameters = function () {
      return [{
        type: _energy_consumption_service__WEBPACK_IMPORTED_MODULE_2__["EnergyConsumptionService"]
      }];
    };

    EnergyConsumptionComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-energy-consumption',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./energy-consumption.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/energy-consumption.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./energy-consumption.component.css */
      "./src/app/utility/energy-consumption/energy-consumption.component.css"))["default"]]
    })], EnergyConsumptionComponent);
    /***/
  },

  /***/
  "./src/app/utility/energy-consumption/energy-consumption.service.ts":
  /*!**************************************************************************!*\
    !*** ./src/app/utility/energy-consumption/energy-consumption.service.ts ***!
    \**************************************************************************/

  /*! exports provided: EnergyConsumptionService */

  /***/
  function srcAppUtilityEnergyConsumptionEnergyConsumptionServiceTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "EnergyConsumptionService", function () {
      return EnergyConsumptionService;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");
    /* harmony import */


    var _angular_forms__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/forms */
    "./node_modules/@angular/forms/fesm2015/forms.js");

    var EnergyConsumptionService = function EnergyConsumptionService() {
      _classCallCheck(this, EnergyConsumptionService);

      this.energySource = new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormGroup"]({
        electricity: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]),
        naturalGas: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]),
        lpg: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]),
        fuelOil: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]),
        coal: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]),
        wood: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]),
        paper: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]),
        otherGas: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required]),
        otherEnergy: new _angular_forms__WEBPACK_IMPORTED_MODULE_2__["FormControl"](false, [_angular_forms__WEBPACK_IMPORTED_MODULE_2__["Validators"].required])
      });
    };

    EnergyConsumptionService = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Injectable"])({
      providedIn: 'root'
    })], EnergyConsumptionService);
    /***/
  },

  /***/
  "./src/app/utility/energy-consumption/energy-source/energy-source.component.css":
  /*!**************************************************************************************!*\
    !*** ./src/app/utility/energy-consumption/energy-source/energy-source.component.css ***!
    \**************************************************************************************/

  /*! exports provided: default */

  /***/
  function srcAppUtilityEnergyConsumptionEnergySourceEnergySourceComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzcmMvYXBwL3V0aWxpdHkvZW5lcmd5LWNvbnN1bXB0aW9uL2VuZXJneS1zb3VyY2UvZW5lcmd5LXNvdXJjZS5jb21wb25lbnQuY3NzIn0= */";
    /***/
  },

  /***/
  "./src/app/utility/energy-consumption/energy-source/energy-source.component.ts":
  /*!*************************************************************************************!*\
    !*** ./src/app/utility/energy-consumption/energy-source/energy-source.component.ts ***!
    \*************************************************************************************/

  /*! exports provided: EnergySourceComponent */

  /***/
  function srcAppUtilityEnergyConsumptionEnergySourceEnergySourceComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "EnergySourceComponent", function () {
      return EnergySourceComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");
    /* harmony import */


    var _energy_consumption_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! ../energy-consumption.service */
    "./src/app/utility/energy-consumption/energy-consumption.service.ts");

    var EnergySourceComponent = /*#__PURE__*/function () {
      function EnergySourceComponent(service) {
        _classCallCheck(this, EnergySourceComponent);

        this.service = service;
        this.energySource = this.service.energySource;
      }

      _createClass(EnergySourceComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }, {
        key: "formChange",
        value: function formChange() {
          console.log(this.energySource.value.electricity);
        }
      }]);

      return EnergySourceComponent;
    }();

    EnergySourceComponent.ctorParameters = function () {
      return [{
        type: _energy_consumption_service__WEBPACK_IMPORTED_MODULE_2__["EnergyConsumptionService"]
      }];
    };

    EnergySourceComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-energy-source',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./energy-source.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/energy-consumption/energy-source/energy-source.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./energy-source.component.css */
      "./src/app/utility/energy-consumption/energy-source/energy-source.component.css"))["default"]]
    })], EnergySourceComponent);
    /***/
  },

  /***/
  "./src/app/utility/help-panel/help-panel.component.css":
  /*!*************************************************************!*\
    !*** ./src/app/utility/help-panel/help-panel.component.css ***!
    \*************************************************************/

  /*! exports provided: default */

  /***/
  function srcAppUtilityHelpPanelHelpPanelComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzcmMvYXBwL3V0aWxpdHkvaGVscC1wYW5lbC9oZWxwLXBhbmVsLmNvbXBvbmVudC5jc3MifQ== */";
    /***/
  },

  /***/
  "./src/app/utility/help-panel/help-panel.component.ts":
  /*!************************************************************!*\
    !*** ./src/app/utility/help-panel/help-panel.component.ts ***!
    \************************************************************/

  /*! exports provided: HelpPanelComponent */

  /***/
  function srcAppUtilityHelpPanelHelpPanelComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "HelpPanelComponent", function () {
      return HelpPanelComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var HelpPanelComponent = /*#__PURE__*/function () {
      function HelpPanelComponent() {
        _classCallCheck(this, HelpPanelComponent);
      }

      _createClass(HelpPanelComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return HelpPanelComponent;
    }();

    HelpPanelComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-help-panel',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./help-panel.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/help-panel/help-panel.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./help-panel.component.css */
      "./src/app/utility/help-panel/help-panel.component.css"))["default"]]
    })], HelpPanelComponent);
    /***/
  },

  /***/
  "./src/app/utility/utility.component.css":
  /*!***********************************************!*\
    !*** ./src/app/utility/utility.component.css ***!
    \***********************************************/

  /*! exports provided: default */

  /***/
  function srcAppUtilityUtilityComponentCss(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */


    __webpack_exports__["default"] = "#utility .banner {\n    background-color: #c53f00;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvdXRpbGl0eS91dGlsaXR5LmNvbXBvbmVudC5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7SUFDSSx5QkFBeUI7QUFDN0IiLCJmaWxlIjoic3JjL2FwcC91dGlsaXR5L3V0aWxpdHkuY29tcG9uZW50LmNzcyIsInNvdXJjZXNDb250ZW50IjpbIiN1dGlsaXR5IC5iYW5uZXIge1xuICAgIGJhY2tncm91bmQtY29sb3I6ICNjNTNmMDA7XG59Il19 */";
    /***/
  },

  /***/
  "./src/app/utility/utility.component.ts":
  /*!**********************************************!*\
    !*** ./src/app/utility/utility.component.ts ***!
    \**********************************************/

  /*! exports provided: UtilityComponent */

  /***/
  function srcAppUtilityUtilityComponentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "UtilityComponent", function () {
      return UtilityComponent;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");

    var UtilityComponent = /*#__PURE__*/function () {
      function UtilityComponent() {
        _classCallCheck(this, UtilityComponent);
      }

      _createClass(UtilityComponent, [{
        key: "ngOnInit",
        value: function ngOnInit() {}
      }]);

      return UtilityComponent;
    }();

    UtilityComponent = tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"]([Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
      selector: 'app-utility',
      template: tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! raw-loader!./utility.component.html */
      "./node_modules/raw-loader/dist/cjs.js!./src/app/utility/utility.component.html"))["default"],
      styles: [tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"](__webpack_require__(
      /*! ./utility.component.css */
      "./src/app/utility/utility.component.css"))["default"]]
    })], UtilityComponent);
    /***/
  },

  /***/
  "./src/environments/environment.ts":
  /*!*****************************************!*\
    !*** ./src/environments/environment.ts ***!
    \*****************************************/

  /*! exports provided: environment */

  /***/
  function srcEnvironmentsEnvironmentTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony export (binding) */


    __webpack_require__.d(__webpack_exports__, "environment", function () {
      return environment;
    });
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js"); // This file can be replaced during build by using the `fileReplacements` array.
    // `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
    // The list of file replacements can be found in `angular.json`.


    var environment = {
      production: false
    };
    /*
     * For easier debugging in development mode, you can import the following file
     * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
     *
     * This import should be commented out in production mode because it will have a negative impact
     * on performance if an error is thrown.
     */
    // import 'zone.js/dist/zone-error';  // Included with Angular CLI.

    /***/
  },

  /***/
  "./src/main.ts":
  /*!*********************!*\
    !*** ./src/main.ts ***!
    \*********************/

  /*! no exports provided */

  /***/
  function srcMainTs(module, __webpack_exports__, __webpack_require__) {
    "use strict";

    __webpack_require__.r(__webpack_exports__);
    /* harmony import */


    var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    /*! tslib */
    "./node_modules/tslib/tslib.es6.js");
    /* harmony import */


    var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
    /*! @angular/core */
    "./node_modules/@angular/core/fesm2015/core.js");
    /* harmony import */


    var _angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
    /*! @angular/platform-browser-dynamic */
    "./node_modules/@angular/platform-browser-dynamic/fesm2015/platform-browser-dynamic.js");
    /* harmony import */


    var _app_app_module__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
    /*! ./app/app.module */
    "./src/app/app.module.ts");
    /* harmony import */


    var _environments_environment__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
    /*! ./environments/environment */
    "./src/environments/environment.ts");

    if (_environments_environment__WEBPACK_IMPORTED_MODULE_4__["environment"].production) {
      Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["enableProdMode"])();
    }

    Object(_angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_2__["platformBrowserDynamic"])().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_3__["AppModule"])["catch"](function (err) {
      return console.error(err);
    });
    /***/
  },

  /***/
  0:
  /*!***************************!*\
    !*** multi ./src/main.ts ***!
    \***************************/

  /*! no static exports found */

  /***/
  function _(module, exports, __webpack_require__) {
    module.exports = __webpack_require__(
    /*! /Users/2d7/Desktop/VERIFI/src/main.ts */
    "./src/main.ts");
    /***/
  }
}, [[0, "runtime", "vendor"]]]);
//# sourceMappingURL=main-es5.js.map