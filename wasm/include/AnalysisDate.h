

#ifndef ANALYSISDATE_H
#define ANALYSISDATE_H

class AnalysisDate
{
public:
    /**
     * @brief
     *
     */
    AnalysisDate(){};

    AnalysisDate(
        int month,
        int year) : month(month), year(year)
    {
    };

    int month;
    // int day;
    int year;

    void nextMonth()
    {
        if (month == 11)
        {
            month = 0;
            year = year + 1;
        }
        else
        {
            month = month + 1;
        }
    }
};

#endif // ANALYSISDATE_H