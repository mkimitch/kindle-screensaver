"use strict";

import {
	ArrowDownToLine,
	ArrowUpFromLine,
	Cloud,
	CloudFog,
	CloudLightning,
	CloudMoon,
	CloudRain,
	CloudSnow,
	CloudSun,
	Moon,
	Sun,
	Sunrise,
	Sunset,
	Thermometer,
	TriangleAlert,
} from "lucide-static";

import { config, getRenderDimensions } from "./config.js";
import { createDashboardViewModel } from "./view-model.js";

const escapeHtml = ( value ) => {
	return String( value )
		.replaceAll( "&", "&amp;" )
		.replaceAll( "<", "&lt;" )
		.replaceAll( ">", "&gt;" )
		.replaceAll( '"', "&quot;" )
		.replaceAll( "'", "&#39;" );
};

const iconMarkupByName = {
	alert: TriangleAlert,
	cloud: Cloud,
	fog: CloudFog,
	moon: Moon,
	moonrise: ArrowUpFromLine,
	moonset: ArrowDownToLine,
	"partly-cloudy-day": CloudSun,
	"partly-cloudy-night": CloudMoon,
	rain: CloudRain,
	snow: CloudSnow,
	storm: CloudLightning,
	sun: Sun,
	sunrise: Sunrise,
	sunset: Sunset,
	thermometer: Thermometer,
};

const getIconMarkup = ( name ) => {
	return iconMarkupByName[ name ] || iconMarkupByName.cloud;
};

const renderIconMarkup = ( iconName, className ) => {
	return `<span aria-hidden="true" class="${ className }">${ getIconMarkup( iconName ) }</span>`;
};

const renderMetricMarkup = ( metric ) => {
	const metricClassName = metric.isWide ? "metric metric--wide" : "metric";

	return `<article class="${ metricClassName }">
		<div class="metric-header">
			${ renderIconMarkup( metric.iconName, "metric-icon" ) }
			<h2 class="metric-label">${ escapeHtml( metric.label ) }</h2>
		</div>
		<p class="metric-value">${ escapeHtml( metric.value ) }</p>
	</article>`;
};

const renderAlertMarkup = ( alert ) => {
	if ( !alert ) {
		return "";
	}

	return `<section aria-label="${ escapeHtml( alert.label ) }" class="alert" role="note">
		<div class="alert-header">
			${ renderIconMarkup( "alert", "alert-icon" ) }
			<p class="alert-label">${ escapeHtml( alert.label ) }</p>
		</div>
		<p class="alert-title">${ escapeHtml( alert.title ) }</p>
	</section>`;
};

export const renderDashboardDocument = ( viewModel, options = {} ) => {
	const orientation = options.orientation || config.renderOrientation;
	const renderDimensions = getRenderDimensions( orientation );
	const resolvedOrientation = renderDimensions.width > renderDimensions.height
		? "landscape"
		: "portrait";
	const {
		alert,
		conditionIconName,
		conditionSummary,
		currentTemperature,
		feelsLikeTemperature,
		metrics,
		temperatureUnitBadge,
		updatedLabel,
	} = viewModel;
	const metricsMarkup = metrics.map( renderMetricMarkup ).join( "" );

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta content="width=device-width, initial-scale=1" name="viewport">
	<title>Kindle Weather Dashboard</title>
	<style>
		:root {
			--page-height: ${ renderDimensions.height }px;
			--page-width: ${ renderDimensions.width }px;
			color-scheme: light;
		}

		* {
			box-sizing: border-box;
		}

		html,
		body {
			background: #ffffff;
			color: #000000;
			font-family: Arial, Helvetica, sans-serif;
			height: 100%;
			margin: 0;
			padding: 0;
		}

		body {
			height: var( --page-height );
			width: var( --page-width );
		}

		main {
			display: grid;
			gap: 32px;
			grid-template-areas:
				"header"
				"primary"
				"alert"
				"metrics";
			grid-template-rows: auto auto auto minmax( 0, 1fr );
			height: 100%;
			padding: 60px 64px 56px;
		}

		body[data-has-alert="false"] main {
			grid-template-areas:
				"header"
				"primary"
				"metrics";
			grid-template-rows: auto auto minmax( 0, 1fr );
		}

		.header {
			display: flex;
			grid-area: header;
			justify-content: flex-end;
		}

		.updated {
			font-size: 24px;
			font-weight: 600;
			letter-spacing: 0.08em;
			margin: 0;
			text-transform: uppercase;
		}

		.primary {
			grid-area: primary;
		}

		.primary-summary {
			align-items: end;
			display: grid;
			gap: 24px;
			grid-template-columns: minmax( 0, 1fr ) auto;
		}

		.temperature-block {
			display: grid;
			gap: 12px;
		}

		.temperature-heading {
			align-items: flex-start;
			display: flex;
			gap: 16px;
		}

		.temperature {
			font-size: 268px;
			font-weight: 700;
			letter-spacing: -0.06em;
			line-height: 0.84;
			margin: 0;
		}

		.temperature-unit {
			align-self: flex-start;
			border: 3px solid #000000;
			border-radius: 999px;
			font-size: 30px;
			font-weight: 700;
			letter-spacing: 0.08em;
			line-height: 1;
			margin: 28px 0 0;
			padding: 10px 16px 11px;
			text-transform: uppercase;
		}

		.condition {
			font-size: 60px;
			font-weight: 600;
			line-height: 1.02;
			margin: 0;
			max-inline-size: 12ch;
		}

		.feels-like {
			font-size: 34px;
			font-weight: 500;
			line-height: 1.18;
			margin: 0;
		}

		.condition-icon {
			align-items: center;
			color: #000000;
			display: flex;
			height: 150px;
			justify-content: center;
			width: 150px;
		}

		.lucide {
			height: 100%;
			width: 100%;
		}

		.alert {
			background: #f3f3f3;
			border: 4px solid #000000;
			display: grid;
			gap: 12px;
			grid-area: alert;
			margin: 0;
			padding: 18px 20px 20px;
		}

		.alert-header {
			align-items: center;
			display: flex;
			gap: 12px;
		}

		.alert-icon {
			color: #000000;
			display: flex;
			height: 34px;
			width: 34px;
		}

		.alert-label {
			font-size: 18px;
			font-weight: 700;
			letter-spacing: 0.14em;
			line-height: 1.2;
			margin: 0;
			text-transform: uppercase;
		}

		.alert-title {
			font-size: 34px;
			font-weight: 700;
			line-height: 1.08;
			margin: 0;
		}

		.metrics {
			align-self: end;
			border-top: 3px solid #000000;
			display: grid;
			gap: 18px 20px;
			grid-area: metrics;
			grid-template-columns: repeat( 2, minmax( 0, 1fr ) );
			padding-block-start: 24px;
		}

		.metric {
			background: #f7f7f7;
			border: 2px solid #000000;
			display: grid;
			gap: 10px;
			padding: 16px 18px 18px;
		}

		.metric--wide {
			grid-column: 1 / -1;
		}

		.metric-header {
			align-items: center;
			display: flex;
			gap: 12px;
		}

		.metric-icon {
			color: #000000;
			display: flex;
			height: 34px;
			width: 34px;
		}

		.metric-label {
			font-size: 18px;
			font-weight: 700;
			letter-spacing: 0.12em;
			line-height: 1.2;
			margin: 0;
			text-transform: uppercase;
		}

		.metric-value {
			font-size: 36px;
			font-weight: 600;
			line-height: 1.08;
			margin: 0;
		}

		body[data-orientation="landscape"] main {
			column-gap: 34px;
			grid-template-areas:
				"header header"
				"primary alert"
				"primary metrics";
			grid-template-columns: minmax( 0, 1.35fr ) minmax( 0, 1fr );
			grid-template-rows: auto minmax( 0, 1fr ) minmax( 0, 1fr );
			padding: 50px 54px 48px;
		}

		body[data-orientation="landscape"][data-has-alert="false"] main {
			grid-template-areas:
				"header header"
				"primary metrics";
			grid-template-rows: auto minmax( 0, 1fr );
		}

		body[data-orientation="landscape"] .primary-summary {
			gap: 20px;
			grid-template-columns: minmax( 0, 1fr ) 128px;
		}

		body[data-orientation="landscape"] .temperature {
			font-size: 220px;
		}

		body[data-orientation="landscape"] .temperature-unit {
			font-size: 26px;
			margin-top: 24px;
		}

		body[data-orientation="landscape"] .condition {
			font-size: 52px;
		}

		body[data-orientation="landscape"] .feels-like {
			font-size: 30px;
		}

		body[data-orientation="landscape"] .condition-icon {
			height: 128px;
			width: 128px;
		}

		body[data-orientation="landscape"] .alert-title {
			font-size: 30px;
		}

		body[data-orientation="landscape"] .metrics {
			align-self: start;
			border-inline-start: 3px solid #000000;
			border-top: none;
			gap: 14px;
			grid-template-columns: 1fr;
			padding-block-start: 0;
			padding-inline-start: 24px;
		}

		body[data-orientation="landscape"] .metric--wide {
			grid-column: auto;
		}

		body[data-orientation="landscape"] .metric-value {
			font-size: 30px;
		}
	</style>
</head>
<body data-has-alert="${ alert ? "true" : "false" }" data-orientation="${ escapeHtml( resolvedOrientation ) }">
	<main>
		<header class="header">
			<p class="updated">${ escapeHtml( updatedLabel ) }</p>
		</header>
		<section class="primary">
			<div class="primary-summary">
				<div class="temperature-block">
					<div class="temperature-heading">
						<h1 class="temperature">${ escapeHtml( currentTemperature ) }</h1>
						<p class="temperature-unit">${ escapeHtml( temperatureUnitBadge ) }</p>
					</div>
					<p class="condition">${ escapeHtml( conditionSummary ) }</p>
					<p class="feels-like">Feels like ${ escapeHtml( feelsLikeTemperature ) }</p>
				</div>
				${ renderIconMarkup( conditionIconName, "condition-icon" ) }
			</div>
		</section>
		${ renderAlertMarkup( alert ) }
		<section class="metrics">${ metricsMarkup }</section>
	</main>
</body>
</html>`;
};

export const createDashboardDocument = ( weatherPayload, options = {} ) => {
	const viewModel = createDashboardViewModel( weatherPayload );

	return renderDashboardDocument( viewModel, options );
};
