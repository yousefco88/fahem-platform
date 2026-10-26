import React from 'react';
import TeacherRoster from '../myspace/TeacherRoster';

export default function TeacherClasses() {
  return (
    <section className="teacher-classes-page" aria-labelledby="teacher-classes-title">
      <header className="teacher-section-heading">
        <div>
          <h2 id="teacher-classes-title">حصصي وطلابي</h2>
          <p>الطلاب والحصص المسندة إليك، وروابط الاجتماعات والتسجيلات.</p>
        </div>
      </header>
      <TeacherRoster />
    </section>
  );
}
