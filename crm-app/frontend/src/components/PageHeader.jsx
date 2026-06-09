import { formTitle, formSubtitle, pageHeader, pageHeaderCenter, pageActions } from '../utils/formStyles';

export default function PageHeader({ title, subtitle, actions, center = false }) {
  return (
    <div className={center ? pageHeaderCenter : pageHeader}>
      <div className="min-w-0">
        <h2 className={`${formTitle} mb-0`}>{title}</h2>
        {subtitle && <p className={`${formSubtitle} mb-0 mt-1`}>{subtitle}</p>}
      </div>
      {actions ? <div className={pageActions}>{actions}</div> : null}
    </div>
  );
}
