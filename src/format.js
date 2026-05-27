"use strict";

const FALLBACK_TEXT = "--";

const normalizeTemperatureUnit = ( value ) => {
	return value === "celsius" ? "celsius" : "fahrenheit";
};

const getValidDate = ( value ) => {
	if ( !value ) {
		return null;
	}

	const date = new Date( value );

	return Number.isNaN( date.getTime() ) ? null : date;
};

const getSafeTimezone = ( timezone ) => {
	return typeof timezone === "string" && timezone.trim() ? timezone : "UTC";
};

const convertTemperatureFromCelsius = ( value, unit ) => {
	return normalizeTemperatureUnit( unit ) === "celsius"
		? value
		: ( value * 9 ) / 5 + 32;
};

export const formatConditionSummary = ( value ) => {
	if ( typeof value !== "string" || !value.trim() ) {
		return FALLBACK_TEXT;
	}

	const trimmedValue = value.trim();

	return `${ trimmedValue.charAt( 0 ).toUpperCase() }${ trimmedValue.slice( 1 ) }`;
};

export const formatHighLow = ( lowValue, highValue, options = {} ) => {
	const highTemperature = formatTemperature( highValue, options );
	const lowTemperature = formatTemperature( lowValue, options );

	return `H ${ highTemperature } / L ${ lowTemperature }`;
};

export const formatTemperature = ( value, options = {} ) => {
	if ( typeof value !== "number" || !Number.isFinite( value ) ) {
		return FALLBACK_TEXT;
	}

	const unit = normalizeTemperatureUnit( options.unit );
	const roundedTemperature = Math.round( convertTemperatureFromCelsius( value, unit ) );
	const suffix = options.includeUnit
		? unit === "celsius"
			? "°C"
			: "°F"
		: "°";

	return `${ roundedTemperature }${ suffix }`;
};

export const formatTemperatureUnitBadge = ( value ) => {
	return normalizeTemperatureUnit( value ) === "celsius" ? "C" : "F";
};

export const formatTime = ( value, timezone ) => {
	const date = getValidDate( value );

	if ( !date ) {
		return FALLBACK_TEXT;
	}

	return new Intl.DateTimeFormat( "en-US", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: getSafeTimezone( timezone ),
	} ).format( date );
};

export const formatUpdatedTimestamp = ( value, timezone ) => {
	const date = getValidDate( value );

	if ( !date ) {
		return "Updated --";
	}

	return `Updated ${ new Intl.DateTimeFormat( "en-US", {
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		month: "short",
		timeZone: getSafeTimezone( timezone ),
	} ).format( date ) }`;
};
