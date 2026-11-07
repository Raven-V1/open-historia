/*! Open Historia — Carbon controls for the interface © 2026 Nicholas Krol, AGPL-3.0-or-later (see LICENSE). */
// The form controls of the interface are IBM Carbon's React components
// (@carbon/react, Apache-2.0), imported one by one from their own files so that
// only what is used is bundled. Their CSS is src/carbon/carbon.scss, which also
// gives them the colours of whichever theme the player has chosen.
import React, { useId } from "react";
import CarbonToggle from "@carbon/react/es/components/Toggle/Toggle.js";
import CarbonSelect from "@carbon/react/es/components/Select/Select.js";
import CarbonSelectItem from "@carbon/react/es/components/SelectItem/SelectItem.js";
import CarbonTextInput from "@carbon/react/es/components/TextInput/TextInput.js";
import CarbonCheckbox from "@carbon/react/es/components/Checkbox/Checkbox.js";
import CarbonComboBox from "@carbon/react/es/components/ComboBox/ComboBox.js";
import CarbonSlider from "@carbon/react/es/components/Slider/Slider.js";

// A switch. Its label is shown by the row around it, so Carbon's is kept for
// screen readers and its On / Off words are left out.
export const SwitchControl = ({ label, checked, onChange, disabled = false }) => {
  const id = useId();
  return (
    <CarbonToggle
      id={`oh-switch-${id}`}
      size="sm"
      labelText={<span className="cds--visually-hidden">{label}</span>}
      labelA=" "
      labelB=" "
      toggled={Boolean(checked)}
      disabled={disabled}
      onToggle={(on) => onChange?.(on)}
      onClick={(event) => event.stopPropagation()}
    />
  );
};

export { CarbonComboBox, CarbonSelect, CarbonSelectItem, CarbonTextInput, CarbonCheckbox, CarbonSlider };
